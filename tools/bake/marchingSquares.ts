/**
 * Marching-squares cell cutting: split one grid cell into land and water
 * triangles along the shoreline.
 *
 * This replaces the constrained Delaunay triangulation the old runtime used.
 * Working one cell at a time makes the problem local and finite: there are 16
 * corner classifications, each with a known decomposition, so there is no
 * global solver, no sliver backstop heuristic, and no failure mode that needs
 * a whole-tile fallback.
 *
 * Corner and edge numbering, in cell-local coordinates where x runs east and
 * y runs south (matching the row-major DEM grid, v=0 at the north edge):
 *
 *      c0 (0,0) ---- e0 ---- c1 (1,0)
 *          |                    |
 *         e3                   e1
 *          |                    |
 *      c3 (0,1) ---- e2 ---- c2 (1,1)
 *
 * `edgeCrossings[i]` is where the shoreline crosses the edge leaving corner i,
 * as a parameter in [0, 1] along that edge. It is required whenever the two
 * corners of that edge differ in class, and ignored otherwise.
 *
 * Slivers are eliminated by construction rather than detected afterwards: a
 * crossing within `SNAP_EPS` of either end is snapped onto that corner, which
 * collapses the offending triangle to zero area so it is dropped.
 */

/**
 * A cell-local point. `shore` marks the ones that came from a shoreline
 * crossing rather than a cell corner.
 *
 * Land and water become separate meshes downstream, and they have to agree on
 * height exactly where they meet or the seam opens. Tagging the crossings here
 * is what lets the projection recognise them. Matching land against water
 * positions numerically instead is fragile: adjacent leaves compute the same
 * crossing independently and can disagree in the last decimal.
 */
export type Vec2 = { x: number; y: number; shore?: boolean };

/** A crossing closer than this (in cell fractions) collapses onto the corner. */
export const SNAP_EPS = 1e-3;

/** Triangles below this area (in cell fractions) are discarded as degenerate. */
export const MIN_AREA = 1e-9;

export interface CellCutInput {
    /** Land flag for c0..c3, in the order shown above. */
    corners: readonly [boolean, boolean, boolean, boolean];
    /** Crossing parameter in [0,1] along edge i (c_i -> c_{i+1}), or undefined. */
    edgeCrossings: readonly (number | undefined)[];
    /**
     * Only consulted for the two ambiguous saddle cases (land on one diagonal,
     * water on the other). True when the cell centre is land.
     */
    centreIsLand?: boolean;
}

export interface CellCutResult {
    /** Cell-local triangles, 3 points each, counter-clockwise in (x, y-down). */
    land: Vec2[][];
    water: Vec2[][];
}

const CORNERS: readonly Vec2[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
];

function lerpOnEdge(edge: number, t: number): Vec2 {
    const a = CORNERS[edge];
    const b = CORNERS[(edge + 1) % 4];
    // Every point this produces lies on the shoreline by construction.
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, shore: true };
}

function signedArea(p: Vec2[]): number {
    let s = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        s += (p[j].x * p[i].y) - (p[i].x * p[j].y);
    }
    return s / 2;
}

/** Fan-triangulate a convex ring, dropping degenerate output. */
function fan(poly: Vec2[], out: Vec2[][]): void {
    if (poly.length < 3) {
        return;
    }
    const ccw = signedArea(poly) >= 0;
    for (let i = 1; i + 1 < poly.length; i++) {
        const tri = ccw
            ? [poly[0], poly[i], poly[i + 1]]
            : [poly[0], poly[i + 1], poly[i]];
        if (Math.abs(signedArea(tri)) > MIN_AREA) {
            out.push(tri);
        }
    }
}

function dedupe(poly: Vec2[]): Vec2[] {
    const out: Vec2[] = [];
    for (const p of poly) {
        const last = out[out.length - 1];
        if (!last || Math.abs(last.x - p.x) > 1e-12 || Math.abs(last.y - p.y) > 1e-12) {
            out.push(p);
        }
    }
    while (out.length > 1) {
        const first = out[0];
        const last = out[out.length - 1];
        if (Math.abs(first.x - last.x) < 1e-12 && Math.abs(first.y - last.y) < 1e-12) {
            out.pop();
        } else {
            break;
        }
    }
    return out;
}

/**
 * Cut one cell. Returns land and water triangles that exactly tile the unit
 * cell: no gaps, no overlaps, every triangle tagged by the class of the region
 * it came from.
 */
export function cutCell(input: CellCutInput): CellCutResult {
    const { corners } = input;
    const land: Vec2[][] = [];
    const water: Vec2[][] = [];

    const nLand = corners.reduce((n, c) => n + (c ? 1 : 0), 0);

    // Uniform cell: no shoreline, split along a diagonal.
    if (nLand === 0 || nLand === 4) {
        const quad = [CORNERS[0], CORNERS[1], CORNERS[2], CORNERS[3]];
        fan(quad, nLand === 4 ? land : water);
        return { land, water };
    }

    // Snap crossings onto corners when they are within SNAP_EPS, so the
    // triangle that would have been a sliver collapses to zero area instead.
    const cross: (Vec2 | undefined)[] = [];
    for (let e = 0; e < 4; e++) {
        const a = corners[e];
        const b = corners[(e + 1) % 4];
        if (a === b) {
            cross.push(undefined);
            continue;
        }
        let t = input.edgeCrossings[e];
        if (t === undefined || !Number.isFinite(t)) {
            // No geometry supplied for a genuine crossing: fall back to the
            // edge midpoint so the cell still tiles rather than tearing.
            t = 0.5;
        }
        t = t < SNAP_EPS ? 0 : t > 1 - SNAP_EPS ? 1 : t;
        cross.push(lerpOnEdge(e, t));
    }

    const isSaddle = nLand === 2 && corners[0] === corners[2] && corners[1] === corners[3];

    if (!isSaddle) {
        // Exactly two crossings; they split the cell boundary into a land arc
        // and a water arc. Each arc plus the chord between the crossings is a
        // convex polygon.
        const landPoly: Vec2[] = [];
        const waterPoly: Vec2[] = [];
        for (let c = 0; c < 4; c++) {
            (corners[c] ? landPoly : waterPoly).push(CORNERS[c]);
            const x = cross[c];
            if (x) {
                landPoly.push(x);
                waterPoly.push(x);
            }
        }
        fan(dedupe(landPoly), land);
        fan(dedupe(waterPoly), water);
        return { land, water };
    }

    // Saddle: land occupies one diagonal, water the other, and all four edges
    // are crossed. Which pair joins through the middle is genuinely ambiguous
    // from the corners alone, so the caller samples the cell centre.
    const centreIsLand = input.centreIsLand ?? corners[0];
    const majorityIsLand = centreIsLand;

    // The two minority corners each become a corner triangle; the majority
    // takes the remaining hexagon.
    const minorityCorners = [0, 1, 2, 3].filter(c => corners[c] !== majorityIsLand);
    const minorityOut = majorityIsLand ? water : land;
    const majorityOut = majorityIsLand ? land : water;

    for (const c of minorityCorners) {
        const before = cross[(c + 3) % 4];
        const after = cross[c];
        if (before && after) {
            fan(dedupe([before, CORNERS[c], after]), minorityOut);
        }
    }

    const hex: Vec2[] = [];
    for (let c = 0; c < 4; c++) {
        if (corners[c] === majorityIsLand) {
            const before = cross[(c + 3) % 4];
            if (before) {
                hex.push(before);
            }
            hex.push(CORNERS[c]);
            const after = cross[c];
            if (after) {
                hex.push(after);
            }
        }
    }
    fan(dedupe(hex), majorityOut);

    return { land, water };
}
