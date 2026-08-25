/**
 * Restricted-quadtree decimation of a tile's height grid.
 *
 * A tile arrives as `size x size` height nodes (so `size - 1` cells per side).
 * We build a quadtree over the cells and merge a block into a single leaf while
 * two conditions hold:
 *
 *   1. the block's heights stay within `maxErrorM` of the bilinear surface
 *      through its four corners, and
 *   2. the block does not straddle the shoreline.
 *
 * Condition 2 is what keeps the coast crisp: any block containing a land/water
 * transition is refused, so shoreline blocks always bottom out at `minLeafSize`
 * and get handed to the marching-squares cutter at that scale.
 *
 * The tree is then *balanced* so neighbouring leaves differ by at most one
 * level. That bounds T-junctions to a single midpoint per edge, which the
 * triangulation absorbs by fanning the leaf from its centre through a ring that
 * includes the midpoint wherever the neighbour is finer. Nothing is finer than
 * `minLeafSize`, so a shoreline leaf never needs a midpoint of its own and the
 * cutter's output can be used verbatim.
 *
 * Everything here works in grid coordinates: x east, y south, matching the
 * row-major DEM layout with v=0 at the north edge.
 */

import { Vec2, cutCell } from './marchingSquares';

export interface DecimateInput {
    /** Node count per side; cells per side is `size - 1`. */
    size: number;
    /** Row-major heights, `size * size`. */
    heights: Float32Array;
    /** Row-major land flags per *node*, `size * size`. 1 = land. */
    landNodes: Uint8Array;
    /** Vertical tolerance (m) for merging a block. */
    maxErrorM: number;
    /**
     * Finest leaf, in cells. Raising it coarsens the shoreline as well as the
     * interior, which is the lever the triangle budget turns.
     */
    minLeafSize?: number;
    /** Largest leaf, in cells. Caps how flat a region may be drawn. */
    maxLeafSize?: number;
    /**
     * Crossing parameter along the cell edge from node `a` to node `b`, in
     * [0, 1]. Supplied by the shoreline geometry; defaults to the midpoint.
     */
    edgeCrossing?: (ax: number, ay: number, bx: number, by: number) => number | undefined;
    /** True when the centre of a saddle block is land. Defaults to corner c0. */
    centreIsLand?: (x: number, y: number, size: number) => boolean;
}

export interface GridTriangle {
    /** Grid-space corners; may be fractional where the shoreline cuts a cell. */
    pts: [Vec2, Vec2, Vec2];
    land: boolean;
}

export interface DecimateResult {
    triangles: GridTriangle[];
    /** Leaf count by size, for diagnostics and budget search. */
    leafCount: number;
    shorelineLeafCount: number;
}

interface Leaf {
    x: number;
    y: number;
    size: number;
    uniform: boolean;
    land: boolean;
}

function isPow2(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}

export function decimate(input: DecimateInput): DecimateResult {
    const { size, heights, landNodes, maxErrorM } = input;
    const cells = size - 1;
    if (!isPow2(cells)) {
        throw new Error(`decimate: ${size} nodes gives ${cells} cells, which is not a power of two`);
    }
    const minLeafSize = input.minLeafSize ?? 1;
    const maxLeafSize = input.maxLeafSize ?? cells;
    if (!isPow2(minLeafSize) || !isPow2(maxLeafSize)) {
        throw new Error('decimate: minLeafSize and maxLeafSize must be powers of two');
    }

    const h = (x: number, y: number) => heights[y * size + x];
    const isLand = (x: number, y: number) => landNodes[y * size + x] !== 0;

    /** True when every node of the block shares one class. */
    const blockUniform = (bx: number, by: number, s: number): boolean => {
        const first = isLand(bx, by);
        for (let y = by; y <= by + s; y++) {
            for (let x = bx; x <= bx + s; x++) {
                if (isLand(x, y) !== first) {
                    return false;
                }
            }
        }
        return true;
    };

    /** Max |height - bilinear(corners)| over the block. */
    const blockError = (bx: number, by: number, s: number): number => {
        const h00 = h(bx, by);
        const h10 = h(bx + s, by);
        const h01 = h(bx, by + s);
        const h11 = h(bx + s, by + s);
        let worst = 0;
        for (let y = 0; y <= s; y++) {
            const v = y / s;
            for (let x = 0; x <= s; x++) {
                const u = x / s;
                const bilinear = h00 * (1 - u) * (1 - v)
                    + h10 * u * (1 - v)
                    + h01 * (1 - u) * v
                    + h11 * u * v;
                const d = Math.abs(h(bx + x, by + y) - bilinear);
                if (d > worst) {
                    worst = d;
                }
            }
        }
        return worst;
    };

    // --- 1. Top-down subdivision -------------------------------------------
    const leaves: Leaf[] = [];
    const subdivide = (bx: number, by: number, s: number): void => {
        if (s <= minLeafSize) {
            const uniform = blockUniform(bx, by, s);
            leaves.push({ x: bx, y: by, size: s, uniform, land: uniform && isLand(bx, by) });
            return;
        }
        const uniform = blockUniform(bx, by, s);
        if (uniform && s <= maxLeafSize && blockError(bx, by, s) <= maxErrorM) {
            leaves.push({ x: bx, y: by, size: s, uniform: true, land: isLand(bx, by) });
            return;
        }
        const half = s / 2;
        subdivide(bx, by, half);
        subdivide(bx + half, by, half);
        subdivide(bx, by + half, half);
        subdivide(bx + half, by + half, half);
    };
    subdivide(0, 0, cells);

    // --- 2. Balance so neighbours differ by at most one level ---------------
    // `owner[cell]` is the index of the leaf covering that cell.
    const owner = new Int32Array(cells * cells).fill(-1);
    const paint = (leafIndex: number) => {
        const l = leaves[leafIndex];
        for (let y = l.y; y < l.y + l.size; y++) {
            for (let x = l.x; x < l.x + l.size; x++) {
                owner[y * cells + x] = leafIndex;
            }
        }
    };
    for (let i = 0; i < leaves.length; i++) {
        paint(i);
    }

    const neighbourSizes = (l: Leaf): number[] => {
        const out: number[] = [];
        const probe = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= cells || y >= cells) {
                return;
            }
            const idx = owner[y * cells + x];
            if (idx >= 0) {
                out.push(leaves[idx].size);
            }
        };
        for (let k = 0; k < l.size; k++) {
            probe(l.x + k, l.y - 1);
            probe(l.x + k, l.y + l.size);
            probe(l.x - 1, l.y + k);
            probe(l.x + l.size, l.y + k);
        }
        return out;
    };

    let changed = true;
    let guard = 0;
    while (changed) {
        changed = false;
        if (++guard > 64) {
            throw new Error('decimate: balance did not converge');
        }
        for (let i = 0; i < leaves.length; i++) {
            const l = leaves[i];
            if (l.size <= minLeafSize) {
                continue;
            }
            const finest = Math.min(...neighbourSizes(l), l.size);
            if (finest >= l.size / 2) {
                continue;
            }
            // Split this leaf into four and re-paint.
            const half = l.size / 2;
            const kids: Leaf[] = [
                { x: l.x, y: l.y, size: half, uniform: false, land: false },
                { x: l.x + half, y: l.y, size: half, uniform: false, land: false },
                { x: l.x, y: l.y + half, size: half, uniform: false, land: false },
                { x: l.x + half, y: l.y + half, size: half, uniform: false, land: false },
            ];
            for (const k of kids) {
                k.uniform = blockUniform(k.x, k.y, k.size);
                k.land = k.uniform && isLand(k.x, k.y);
            }
            leaves[i] = kids[0];
            paint(i);
            for (let j = 1; j < kids.length; j++) {
                leaves.push(kids[j]);
                paint(leaves.length - 1);
            }
            changed = true;
        }
    }

    // --- 3. Triangulate ----------------------------------------------------
    const triangles: GridTriangle[] = [];
    let shorelineLeafCount = 0;

    const neighbourSizeAt = (x: number, y: number): number => {
        if (x < 0 || y < 0 || x >= cells || y >= cells) {
            return Number.POSITIVE_INFINITY;
        }
        const idx = owner[y * cells + x];
        return idx >= 0 ? leaves[idx].size : Number.POSITIVE_INFINITY;
    };

    const defaultCrossing = () => undefined;
    const edgeCrossing = input.edgeCrossing ?? defaultCrossing;

    for (const l of leaves) {
        if (!l.uniform) {
            shorelineLeafCount++;
            // Shoreline leaf: cut it with marching squares. Nothing is finer
            // than minLeafSize, so no T-junction midpoint can be required here.
            const c: [boolean, boolean, boolean, boolean] = [
                isLand(l.x, l.y),
                isLand(l.x + l.size, l.y),
                isLand(l.x + l.size, l.y + l.size),
                isLand(l.x, l.y + l.size),
            ];
            const nodes: Vec2[] = [
                { x: l.x, y: l.y },
                { x: l.x + l.size, y: l.y },
                { x: l.x + l.size, y: l.y + l.size },
                { x: l.x, y: l.y + l.size },
            ];
            const crossings: (number | undefined)[] = [];
            for (let e = 0; e < 4; e++) {
                const a = nodes[e];
                const b = nodes[(e + 1) % 4];
                crossings.push(c[e] === c[(e + 1) % 4] ? undefined : edgeCrossing(a.x, a.y, b.x, b.y));
            }
            const cut = cutCell({
                corners: c,
                edgeCrossings: crossings,
                centreIsLand: input.centreIsLand
                    ? input.centreIsLand(l.x, l.y, l.size)
                    : undefined,
            });
            // Carry the shoreline tag through: the projection needs to know
            // which vertices land and water share.
            const lift = (p: Vec2): Vec2 => ({
                x: l.x + p.x * l.size,
                y: l.y + p.y * l.size,
                shore: p.shore,
            });
            for (const t of cut.land) {
                triangles.push({ pts: [lift(t[0]), lift(t[1]), lift(t[2])], land: true });
            }
            for (const t of cut.water) {
                triangles.push({ pts: [lift(t[0]), lift(t[1]), lift(t[2])], land: false });
            }
            continue;
        }

        // Uniform leaf: ring of corners plus a midpoint on any edge whose
        // neighbour is one level finer, fanned from the leaf centre.
        const s = l.size;
        const needMid = [
            neighbourSizeAt(l.x, l.y - 1) < s || neighbourSizeAt(l.x + s - 1, l.y - 1) < s,
            neighbourSizeAt(l.x + s, l.y) < s || neighbourSizeAt(l.x + s, l.y + s - 1) < s,
            neighbourSizeAt(l.x, l.y + s) < s || neighbourSizeAt(l.x + s - 1, l.y + s) < s,
            neighbourSizeAt(l.x - 1, l.y) < s || neighbourSizeAt(l.x - 1, l.y + s - 1) < s,
        ];
        const corners: Vec2[] = [
            { x: l.x, y: l.y },
            { x: l.x + s, y: l.y },
            { x: l.x + s, y: l.y + s },
            { x: l.x, y: l.y + s },
        ];
        const ring: Vec2[] = [];
        for (let e = 0; e < 4; e++) {
            ring.push(corners[e]);
            if (needMid[e]) {
                const a = corners[e];
                const b = corners[(e + 1) % 4];
                ring.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            }
        }
        if (ring.length === 4) {
            triangles.push({ pts: [ring[0], ring[1], ring[2]], land: l.land });
            triangles.push({ pts: [ring[0], ring[2], ring[3]], land: l.land });
        } else {
            const centre: Vec2 = { x: l.x + s / 2, y: l.y + s / 2 };
            for (let i = 0; i < ring.length; i++) {
                const a = ring[i];
                const b = ring[(i + 1) % ring.length];
                triangles.push({ pts: [centre, a, b], land: l.land });
            }
        }
    }

    return { triangles, leafCount: leaves.length, shorelineLeafCount };
}
