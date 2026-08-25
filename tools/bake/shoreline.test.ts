import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CoastPolygon, LonLatBounds, __testing, buildShoreline } from './shoreline';
import { decimate } from './decimate';

const BOUNDS: LonLatBounds = { west: 0, south: 0, east: 1, north: 1 };
const SIZE = 33; // 32 cells

/** Build a polygon from grid-space points, converting back to lon/lat. */
function ringFromGrid(pts: Array<[number, number]>): CoastPolygon {
    const cells = SIZE - 1;
    return {
        exterior: pts.map(([gx, gy]) => ({
            lon: BOUNDS.west + (gx / cells) * (BOUNDS.east - BOUNDS.west),
            lat: BOUNDS.north - (gy / cells) * (BOUNDS.north - BOUNDS.south),
        })),
        holes: [],
    };
}

function countLand(landNodes: Uint8Array): number {
    return landNodes.reduce((n, v) => n + v, 0);
}

describe('Douglas-Peucker simplification', () => {
    it('keeps the endpoints of a polyline', () => {
        const pts = new Float64Array([0, 0, 1, 0.001, 2, 0, 3, 0.002, 4, 0]);
        const keep = __testing.douglasPeucker(pts, 0.01);
        assert.equal(keep[0], 0);
        assert.equal(keep[keep.length - 1], 4);
    });

    it('collapses a nearly straight line to its endpoints', () => {
        const n = 50;
        const pts = new Float64Array(n * 2);
        for (let i = 0; i < n; i++) {
            pts[i * 2] = i;
            pts[i * 2 + 1] = Math.sin(i) * 1e-6;
        }
        assert.deepEqual(__testing.douglasPeucker(pts, 0.01), [0, n - 1]);
    });

    it('keeps a corner that exceeds the tolerance', () => {
        const pts = new Float64Array([0, 0, 5, 5, 10, 0]);
        const keep = __testing.douglasPeucker(pts, 1);
        assert.deepEqual(keep, [0, 1, 2]);
    });

    it('is a no-op at zero tolerance', () => {
        const pts = new Float64Array([0, 0, 1, 1, 2, 0, 3, 3]);
        assert.deepEqual(__testing.douglasPeucker(pts, 0), [0, 1, 2, 3]);
    });

    it('never reduces a ring below a triangle', () => {
        const square = new Float64Array([0, 0, 10, 0, 10, 10, 0, 10]);
        const out = __testing.simplifyRing(square, 1000);
        assert.ok(out.length / 2 >= 3, `got ${out.length / 2} vertices`);
    });

    it('drops redundant collinear ring vertices', () => {
        // A square whose edges are subdivided; simplification should recover
        // roughly the four corners.
        const pts: number[] = [];
        for (let i = 0; i < 10; i++) pts.push(i, 0);
        for (let i = 0; i < 10; i++) pts.push(10, i);
        for (let i = 10; i > 0; i--) pts.push(i, 10);
        for (let i = 10; i > 0; i--) pts.push(0, i);
        const out = __testing.simplifyRing(new Float64Array(pts), 0.5);
        assert.ok(out.length / 2 <= 6, `expected ~4 corners, got ${out.length / 2}`);
        assert.ok(out.length / 2 >= 4);
    });
});

describe('shoreline classification', () => {
    it('marks nodes inside a polygon as land', () => {
        // Square covering grid x,y in [8, 24].
        const poly = ringFromGrid([[8, 8], [24, 8], [24, 24], [8, 24]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        assert.ok(s.mixed);
        assert.equal(s.landNodes[16 * SIZE + 16], 1, 'centre is land');
        assert.equal(s.landNodes[0], 0, 'corner is water');
        // Nodes lying exactly on the ring are decided by the standard
        // half-open scanline rule, which counts a crossing only when the two
        // endpoints straddle the scanline. That includes the northern boundary
        // row and excludes the southern one, so rows 8..23 fill and row 24 does
        // not, while columns 8..24 fill inclusively. The rule has to be
        // half-open or an edge shared by two rings would be counted twice; the
        // exact boundary only matters when a coast lands precisely on a node,
        // and the visible shoreline comes from edgeCrossing regardless.
        assert.equal(countLand(s.landNodes), 16 * 17);
        assert.equal(s.landNodes[8 * SIZE + 16], 1, 'northern boundary row is land');
        assert.equal(s.landNodes[24 * SIZE + 16], 0, 'southern boundary row is not');
    });

    it('reports an all-water tile as unmixed', () => {
        const s = buildShoreline({ polygons: [], bounds: BOUNDS, size: SIZE });
        assert.equal(s.mixed, false);
        assert.equal(countLand(s.landNodes), 0);
    });

    it('subtracts holes from land', () => {
        const cells = SIZE - 1;
        const g = (gx: number, gy: number) => ({
            lon: (gx / cells), lat: 1 - (gy / cells),
        });
        const poly: CoastPolygon = {
            exterior: [g(4, 4), g(28, 4), g(28, 28), g(4, 28)],
            holes: [[g(12, 12), g(20, 12), g(20, 20), g(12, 20)]],
        };
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        assert.equal(s.landNodes[16 * SIZE + 16], 0, 'the lake centre is water');
        assert.equal(s.landNodes[6 * SIZE + 6], 1, 'the surrounding land is land');
    });

    it('samples the block centre for saddle resolution', () => {
        const poly = ringFromGrid([[8, 8], [24, 8], [24, 24], [8, 24]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        assert.equal(s.centreIsLand(12, 12, 4), true);
        assert.equal(s.centreIsLand(0, 0, 2), false);
    });
});

describe('shoreline edge crossings', () => {
    it('places a crossing where the polygon actually cuts the edge', () => {
        // Vertical coast at grid x = 10.25: land to the left.
        const poly = ringFromGrid([[-5, -5], [10.25, -5], [10.25, 40], [-5, 40]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        // Horizontal cell edge from node (10, 5) to (11, 5) is cut at t = 0.25.
        const t = s.edgeCrossing(10, 5, 11, 5);
        assert.ok(t !== undefined, 'crossing recorded');
        assert.ok(Math.abs(t! - 0.25) < 1e-3, `t = ${t}`);
    });

    it('reverses the parameter when the edge is traversed backwards', () => {
        const poly = ringFromGrid([[-5, -5], [10.25, -5], [10.25, 40], [-5, 40]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        const fwd = s.edgeCrossing(10, 5, 11, 5)!;
        const rev = s.edgeCrossing(11, 5, 10, 5)!;
        assert.ok(Math.abs(fwd + rev - 1) < 1e-6, `fwd ${fwd} rev ${rev}`);
    });

    it('records crossings on vertical edges too', () => {
        // Horizontal coast at grid y = 7.5.
        const poly = ringFromGrid([[-5, -5], [40, -5], [40, 7.5], [-5, 7.5]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        const t = s.edgeCrossing(5, 7, 5, 8);
        assert.ok(t !== undefined);
        assert.ok(Math.abs(t! - 0.5) < 1e-3, `t = ${t}`);
    });

    it('returns undefined on an edge the shoreline misses', () => {
        const poly = ringFromGrid([[8, 8], [24, 8], [24, 24], [8, 24]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        assert.equal(s.edgeCrossing(0, 0, 1, 0), undefined);
    });

    it('spans a multi-cell edge, reporting the parameter over the whole span', () => {
        const poly = ringFromGrid([[-5, -5], [10.25, -5], [10.25, 40], [-5, 40]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        // A 4-cell edge from x=8 to x=12 cut at 10.25 -> (10.25-8)/4 = 0.5625.
        const t = s.edgeCrossing(8, 5, 12, 5);
        assert.ok(t !== undefined);
        assert.ok(Math.abs(t! - 0.5625) < 1e-3, `t = ${t}`);
    });
});

describe('shoreline feeding the decimator', () => {
    const flat = new Float32Array(SIZE * SIZE);

    it('produces a watertight mesh for an island', () => {
        const poly = ringFromGrid([[8, 6], [25, 9], [23, 26], [7, 22]]);
        const s = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        const r = decimate({
            size: SIZE,
            heights: flat,
            landNodes: s.landNodes,
            maxErrorM: 1000,
            edgeCrossing: s.edgeCrossing,
            centreIsLand: s.centreIsLand,
        });
        const cells = SIZE - 1;
        const total = r.triangles.reduce((acc, t) => {
            const [a, b, c] = t.pts;
            return acc + Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
        }, 0);
        assert.ok(Math.abs(total - cells * cells) < 1e-6, `area ${total}`);
        assert.ok(r.triangles.some(t => t.land), 'some land');
        assert.ok(r.triangles.some(t => !t.land), 'some water');
    });

    it('cuts fewer cells once the ring is simplified', () => {
        // A deliberately wiggly coast.
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= 32; i++) {
            pts.push([i, 16 + (i % 2 === 0 ? 0.9 : -0.9)]);
        }
        pts.push([32, 40], [0, 40]);
        const poly = ringFromGrid(pts);
        const raw = buildShoreline({ polygons: [poly], bounds: BOUNDS, size: SIZE });
        const simplified = buildShoreline({
            polygons: [poly], bounds: BOUNDS, size: SIZE, simplifyCells: 2,
        });
        const run = (s: ReturnType<typeof buildShoreline>) => decimate({
            size: SIZE,
            heights: flat,
            landNodes: s.landNodes,
            maxErrorM: 1000,
            edgeCrossing: s.edgeCrossing,
            centreIsLand: s.centreIsLand,
        });
        const a = run(raw);
        const b = run(simplified);
        assert.ok(
            b.shorelineLeafCount <= a.shorelineLeafCount,
            `simplified ${b.shorelineLeafCount} vs raw ${a.shorelineLeafCount}`,
        );
        const cells = SIZE - 1;
        for (const r of [a, b]) {
            const total = r.triangles.reduce((acc, t) => {
                const [p, q, s2] = t.pts;
                return acc + Math.abs((q.x - p.x) * (s2.y - p.y) - (s2.x - p.x) * (q.y - p.y)) / 2;
            }, 0);
            assert.ok(Math.abs(total - cells * cells) < 1e-6, `area ${total}`);
        }
    });
});
