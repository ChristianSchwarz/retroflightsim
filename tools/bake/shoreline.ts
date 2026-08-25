/**
 * Turns OSM land polygons into the two things the decimator needs: a land flag
 * per grid node, and the exact position where the shoreline crosses each cell
 * edge.
 *
 * Polygons arrive in lon/lat and are converted to tile grid coordinates first,
 * so everything downstream works in one space. Rings are simplified with
 * Douglas-Peucker *before* cutting, which is what stops a convoluted coastline
 * from driving triangle count without bound.
 *
 * Classification uses a scanline fill rather than per-node point-in-polygon:
 * a 257x257 tile is 66,049 nodes and testing each against every ring edge is
 * needlessly quadratic.
 */

export interface LonLat {
    lon: number;
    lat: number;
}

export interface CoastPolygon {
    exterior: LonLat[];
    holes: LonLat[][];
}

export interface LonLatBounds {
    west: number;
    south: number;
    east: number;
    north: number;
}

export interface ShorelineInput {
    polygons: CoastPolygon[];
    bounds: LonLatBounds;
    /** Node count per side. */
    size: number;
    /** Douglas-Peucker tolerance, in grid cells. 0 disables simplification. */
    simplifyCells?: number;
}

export interface Shoreline {
    /** 1 = land, per node, row-major `size * size`. */
    landNodes: Uint8Array;
    /** True when any node differs from any other. */
    mixed: boolean;
    /** Crossing parameter along a cell edge, or undefined if none recorded. */
    edgeCrossing(ax: number, ay: number, bx: number, by: number): number | undefined;
    /** True when the centre of a block is inside land. */
    centreIsLand(x: number, y: number, size: number): boolean;
}

interface Ring {
    /** Flat grid coords: x0, y0, x1, y1, ... implicitly closed. */
    pts: Float64Array;
}

const NO_CROSSING = -1;

/** Perpendicular distance from p to the segment ab, in grid units. */
function pointSegDistance(
    px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        return Math.hypot(px - ax, py - ay);
    }
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas-Peucker on an open polyline given as flat xy pairs.
 * Returns the indices to keep, always including the first and last.
 */
function douglasPeucker(pts: Float64Array, epsilon: number): number[] {
    const n = pts.length / 2;
    if (n <= 2 || epsilon <= 0) {
        return Array.from({ length: n }, (_, i) => i);
    }
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
    const stack: Array<[number, number]> = [[0, n - 1]];
    while (stack.length > 0) {
        const [lo, hi] = stack.pop()!;
        if (hi - lo < 2) {
            continue;
        }
        let worst = -1;
        let worstIdx = -1;
        for (let i = lo + 1; i < hi; i++) {
            const d = pointSegDistance(
                pts[i * 2], pts[i * 2 + 1],
                pts[lo * 2], pts[lo * 2 + 1],
                pts[hi * 2], pts[hi * 2 + 1],
            );
            if (d > worst) {
                worst = d;
                worstIdx = i;
            }
        }
        if (worst > epsilon && worstIdx > 0) {
            keep[worstIdx] = 1;
            stack.push([lo, worstIdx], [worstIdx, hi]);
        }
    }
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
        if (keep[i]) {
            out.push(i);
        }
    }
    return out;
}

function simplifyRing(pts: Float64Array, epsilon: number): Float64Array {
    const n = pts.length / 2;
    if (n < 4 || epsilon <= 0) {
        return pts;
    }
    // Treat the ring as a closed polyline by repeating the first point, so the
    // start vertex is not privileged into a corner that survives simplification.
    const closed = new Float64Array((n + 1) * 2);
    closed.set(pts);
    closed[n * 2] = pts[0];
    closed[n * 2 + 1] = pts[1];
    const keep = douglasPeucker(closed, epsilon);
    // Drop the duplicated closing vertex.
    const idx = keep.filter(i => i < n);
    if (idx.length < 3) {
        return pts;
    }
    const out = new Float64Array(idx.length * 2);
    for (let i = 0; i < idx.length; i++) {
        out[i * 2] = pts[idx[i] * 2];
        out[i * 2 + 1] = pts[idx[i] * 2 + 1];
    }
    return out;
}

export function buildShoreline(input: ShorelineInput): Shoreline {
    const { polygons, bounds, size } = input;
    const cells = size - 1;
    const lonSpan = bounds.east - bounds.west;
    const latSpan = bounds.north - bounds.south;

    // lon/lat -> grid. y runs south, matching the row-major DEM layout.
    const toGridX = (lon: number) => ((lon - bounds.west) / lonSpan) * cells;
    const toGridY = (lat: number) => ((bounds.north - lat) / latSpan) * cells;

    const simplify = input.simplifyCells ?? 0;
    const rings: Ring[] = [];
    const outerRings: Ring[] = [];
    const holeRings: Ring[] = [];
    for (const poly of polygons) {
        const push = (src: LonLat[], into: Ring[]) => {
            if (src.length < 3) {
                return;
            }
            const raw = new Float64Array(src.length * 2);
            for (let i = 0; i < src.length; i++) {
                raw[i * 2] = toGridX(src[i].lon);
                raw[i * 2 + 1] = toGridY(src[i].lat);
            }
            const ring: Ring = { pts: simplifyRing(raw, simplify) };
            into.push(ring);
            rings.push(ring);
        };
        push(poly.exterior, outerRings);
        for (const hole of poly.holes) {
            push(hole, holeRings);
        }
    }

    // --- classification: even-odd scanline over all rings ------------------
    const landNodes = new Uint8Array(size * size);
    const insideAt = (px: number, py: number): boolean => {
        let inside = false;
        for (const r of rings) {
            const p = r.pts;
            const n = p.length / 2;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const yi = p[i * 2 + 1];
                const yj = p[j * 2 + 1];
                if ((yi > py) !== (yj > py)) {
                    const xi = p[i * 2];
                    const xj = p[j * 2];
                    if (px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                        inside = !inside;
                    }
                }
            }
        }
        return inside;
    };

    // Scanline: for each node row, collect ring crossings once and fill spans.
    const xs: number[] = [];
    for (let row = 0; row < size; row++) {
        const py = row;
        xs.length = 0;
        for (const r of rings) {
            const p = r.pts;
            const n = p.length / 2;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const yi = p[i * 2 + 1];
                const yj = p[j * 2 + 1];
                if ((yi > py) !== (yj > py)) {
                    const xi = p[i * 2];
                    const xj = p[j * 2];
                    xs.push((xj - xi) * (py - yi) / (yj - yi) + xi);
                }
            }
        }
        if (xs.length === 0) {
            continue;
        }
        xs.sort((a, b) => a - b);
        // Even-odd: fill between alternating pairs.
        for (let k = 0; k + 1 < xs.length; k += 2) {
            const from = Math.max(0, Math.ceil(xs[k]));
            const to = Math.min(size - 1, Math.floor(xs[k + 1]));
            for (let col = from; col <= to; col++) {
                landNodes[row * size + col] = 1;
            }
        }
    }

    let mixed = false;
    for (let i = 1; i < landNodes.length; i++) {
        if (landNodes[i] !== landNodes[0]) {
            mixed = true;
            break;
        }
    }

    // --- crossings: walk each ring segment against the grid lines ----------
    // hCross[row * size + col]: crossing on the cell edge (col,row)-(col+1,row).
    // vCross[row * size + col]: crossing on the cell edge (col,row)-(col,row+1).
    const hCross = new Float32Array(size * size).fill(NO_CROSSING);
    const vCross = new Float32Array(size * size).fill(NO_CROSSING);

    const recordH = (row: number, x: number) => {
        if (row < 0 || row >= size) {
            return;
        }
        let col = Math.floor(x);
        let t = x - col;
        if (col === cells && t === 0) {
            col = cells - 1;
            t = 1;
        }
        if (col < 0 || col >= cells) {
            return;
        }
        // Prefer the crossing nearest the edge midpoint when several land on
        // the same edge; it is the most stable choice and the error is bounded
        // by the cell size either way.
        const prev = hCross[row * size + col];
        if (prev === NO_CROSSING || Math.abs(t - 0.5) < Math.abs(prev - 0.5)) {
            hCross[row * size + col] = t;
        }
    };
    const recordV = (col: number, y: number) => {
        if (col < 0 || col >= size) {
            return;
        }
        let row = Math.floor(y);
        let t = y - row;
        if (row === cells && t === 0) {
            row = cells - 1;
            t = 1;
        }
        if (row < 0 || row >= cells) {
            return;
        }
        const prev = vCross[row * size + col];
        if (prev === NO_CROSSING || Math.abs(t - 0.5) < Math.abs(prev - 0.5)) {
            vCross[row * size + col] = t;
        }
    };

    for (const r of rings) {
        const p = r.pts;
        const n = p.length / 2;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const ax = p[j * 2];
            const ay = p[j * 2 + 1];
            const bx = p[i * 2];
            const by = p[i * 2 + 1];
            // Horizontal grid lines (constant y) -> crossings on H edges.
            if (ay !== by) {
                const lo = Math.ceil(Math.min(ay, by));
                const hi = Math.floor(Math.max(ay, by));
                for (let row = lo; row <= hi; row++) {
                    const t = (row - ay) / (by - ay);
                    if (t >= 0 && t <= 1) {
                        recordH(row, ax + (bx - ax) * t);
                    }
                }
            }
            // Vertical grid lines (constant x) -> crossings on V edges.
            if (ax !== bx) {
                const lo = Math.ceil(Math.min(ax, bx));
                const hi = Math.floor(Math.max(ax, bx));
                for (let col = lo; col <= hi; col++) {
                    const t = (col - ax) / (bx - ax);
                    if (t >= 0 && t <= 1) {
                        recordV(col, ay + (by - ay) * t);
                    }
                }
            }
        }
    }

    const edgeCrossing = (ax: number, ay: number, bx: number, by: number): number | undefined => {
        if (ay === by) {
            const row = ay;
            const from = Math.min(ax, bx);
            const to = Math.max(ax, bx);
            const span = to - from;
            let best: number | undefined;
            let bestScore = Infinity;
            for (let col = from; col < to; col++) {
                const t = hCross[row * size + col];
                if (t === NO_CROSSING) {
                    continue;
                }
                const along = (col - from + t) / span;
                const score = Math.abs(along - 0.5);
                if (score < bestScore) {
                    bestScore = score;
                    best = along;
                }
            }
            if (best === undefined) {
                return undefined;
            }
            return ax <= bx ? best : 1 - best;
        }
        if (ax === bx) {
            const col = ax;
            const from = Math.min(ay, by);
            const to = Math.max(ay, by);
            const span = to - from;
            let best: number | undefined;
            let bestScore = Infinity;
            for (let row = from; row < to; row++) {
                const t = vCross[row * size + col];
                if (t === NO_CROSSING) {
                    continue;
                }
                const along = (row - from + t) / span;
                const score = Math.abs(along - 0.5);
                if (score < bestScore) {
                    bestScore = score;
                    best = along;
                }
            }
            if (best === undefined) {
                return undefined;
            }
            return ay <= by ? best : 1 - best;
        }
        return undefined;
    };

    const centreIsLand = (x: number, y: number, blockSize: number): boolean =>
        insideAt(x + blockSize / 2, y + blockSize / 2);

    return { landNodes, mixed, edgeCrossing, centreIsLand };
}

export const __testing = { douglasPeucker, simplifyRing, pointSegDistance };
