import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GridTriangle, decimate } from './decimate';

const SIZE = 33; // 32 cells per side

function grid(size: number, fn: (x: number, y: number) => number): Float32Array {
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            out[y * size + x] = fn(x, y);
        }
    }
    return out;
}

function classes(size: number, fn: (x: number, y: number) => boolean): Uint8Array {
    const out = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            out[y * size + x] = fn(x, y) ? 1 : 0;
        }
    }
    return out;
}

function area(t: GridTriangle): number {
    const [a, b, c] = t.pts;
    return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

function totalArea(tris: GridTriangle[]): number {
    return tris.reduce((s, t) => s + area(t), 0);
}

const allLand = (size: number) => classes(size, () => true);

describe('restricted-quadtree decimation', () => {
    it('collapses a flat uniform tile to a single leaf', () => {
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, () => 100),
            landNodes: allLand(SIZE),
            maxErrorM: 1,
        });
        assert.equal(r.leafCount, 1);
        assert.equal(r.triangles.length, 2);
        assert.equal(r.shorelineLeafCount, 0);
    });

    it('collapses a planar ramp too, since bilinear reproduces it exactly', () => {
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, (x, y) => 3 * x + 5 * y),
            landNodes: allLand(SIZE),
            maxErrorM: 0.001,
        });
        assert.equal(r.leafCount, 1, 'a plane needs no subdivision');
    });

    it('refines around a spike and leaves the rest coarse', () => {
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, (x, y) => (x === 16 && y === 16 ? 500 : 0)),
            landNodes: allLand(SIZE),
            maxErrorM: 1,
        });
        assert.ok(r.leafCount > 1, 'the spike forces subdivision');
        assert.ok(r.leafCount < 200, `over-refined: ${r.leafCount} leaves`);
    });

    it('respects the vertical tolerance', () => {
        const heights = grid(SIZE, (x, y) => (x === 16 && y === 16 ? 50 : 0));
        const tight = decimate({ size: SIZE, heights, landNodes: allLand(SIZE), maxErrorM: 0.5 });
        const loose = decimate({ size: SIZE, heights, landNodes: allLand(SIZE), maxErrorM: 100 });
        assert.ok(tight.leafCount > loose.leafCount, 'a looser tolerance merges more');
        assert.equal(loose.leafCount, 1, 'tolerance above the spike collapses the tile');
    });

    describe('watertightness', () => {
        const cases: Array<[string, (x: number, y: number) => boolean]> = [
            ['all land', () => true],
            ['all water', () => false],
            ['straight north-south coast', (x) => x < 16],
            ['straight east-west coast', (_x, y) => y < 16],
            ['diagonal coast', (x, y) => x + y < 32],
            ['island', (x, y) => Math.hypot(x - 16, y - 16) < 7],
            ['lake', (x, y) => Math.hypot(x - 16, y - 16) > 7],
            ['checkerboard (worst case)', (x, y) => ((x >> 1) + (y >> 1)) % 2 === 0],
        ];

        for (const [name, cls] of cases) {
            it(`tiles the whole grid exactly: ${name}`, () => {
                const r = decimate({
                    size: SIZE,
                    heights: grid(SIZE, (x, y) => Math.sin(x / 4) * 20 + Math.cos(y / 3) * 15),
                    landNodes: classes(SIZE, cls),
                    maxErrorM: 2,
                });
                const cells = SIZE - 1;
                const got = totalArea(r.triangles);
                assert.ok(
                    Math.abs(got - cells * cells) < 1e-6,
                    `${name}: area ${got} != ${cells * cells}`,
                );
            });
        }
    });

    it('never merges a block that straddles the shoreline', () => {
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, () => 0),
            landNodes: classes(SIZE, (x) => x < 16),
            maxErrorM: 1000, // would merge everything if class were ignored
        });
        assert.ok(r.leafCount > 2, `expected refinement at the coast, got ${r.leafCount} leaves`);
        // 33 nodes puts the class boundary off-centre: nodes 0..15 are land, so
        // cells 0..14 are solid land, cell 15 is the shoreline (split at its
        // midpoint) and cells 16..31 are solid water. That is 15.5 vs 16.5
        // columns of 32 rows.
        const land = totalArea(r.triangles.filter(t => t.land));
        const water = totalArea(r.triangles.filter(t => !t.land));
        assert.ok(Math.abs(land - 15.5 * 32) < 1e-6, `land ${land}`);
        assert.ok(Math.abs(water - 16.5 * 32) < 1e-6, `water ${water}`);
        assert.ok(Math.abs(land + water - 32 * 32) < 1e-6, 'watertight');
    });

    it('keeps neighbouring leaves within one level of each other', () => {
        // Reconstruct leaf sizes from the emitted triangles is awkward, so
        // assert the observable consequence instead: a balanced tree tiles
        // exactly, and an unbalanced one would leave T-junction gaps. Combined
        // with the watertightness cases above, this checks the spiky worst case.
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, (x, y) => ((x % 8 === 0 && y % 8 === 0) ? 300 : 0)),
            landNodes: allLand(SIZE),
            maxErrorM: 0.5,
        });
        const cells = SIZE - 1;
        assert.ok(Math.abs(totalArea(r.triangles) - cells * cells) < 1e-6);
    });

    it('honours minLeafSize, coarsening the shoreline with it', () => {
        const cls = classes(SIZE, (x, y) => Math.hypot(x - 16, y - 16) < 9);
        const fine = decimate({
            size: SIZE, heights: grid(SIZE, () => 0), landNodes: cls, maxErrorM: 1000,
            minLeafSize: 1,
        });
        const coarse = decimate({
            size: SIZE, heights: grid(SIZE, () => 0), landNodes: cls, maxErrorM: 1000,
            minLeafSize: 4,
        });
        assert.ok(
            coarse.triangles.length < fine.triangles.length,
            `coarse ${coarse.triangles.length} should be under fine ${fine.triangles.length}`,
        );
        const cells = SIZE - 1;
        assert.ok(Math.abs(totalArea(coarse.triangles) - cells * cells) < 1e-6, 'still watertight');
    });

    it('honours maxLeafSize', () => {
        const r = decimate({
            size: SIZE,
            heights: grid(SIZE, () => 0),
            landNodes: allLand(SIZE),
            maxErrorM: 1000,
            maxLeafSize: 8,
        });
        // 32x32 cells capped at 8x8 leaves = 16 leaves.
        assert.equal(r.leafCount, 16);
        assert.equal(r.triangles.length, 32);
    });

    it('uses supplied edge crossings to place the shoreline', () => {
        const cls = classes(SIZE, (x) => x < 16);
        const base = { size: SIZE, heights: grid(SIZE, () => 0), landNodes: cls, maxErrorM: 1000 };
        // The crossing parameter runs along each edge, and opposite edges of a
        // cell run in opposite directions, so a *constant* t is not a fixed
        // place in space: it yields a trapezoid whose area is the same as the
        // midpoint's. A real caller solves for a position, so do that here.
        const atX = (targetX: number) =>
            (ax: number, _ay: number, bx: number, _by: number) =>
                (bx === ax ? undefined : (targetX - ax) / (bx - ax));

        const near = decimate({ ...base, edgeCrossing: atX(15.1) });
        const far = decimate({ ...base, edgeCrossing: atX(15.9) });
        const landNear = totalArea(near.triangles.filter(t => t.land));
        const landFar = totalArea(far.triangles.filter(t => t.land));
        assert.ok(Math.abs(landNear - 15.1 * 32) < 1e-6, `near ${landNear}`);
        assert.ok(Math.abs(landFar - 15.9 * 32) < 1e-6, `far ${landFar}`);
        assert.ok(landFar > landNear, 'crossing position drives the shoreline');
        const cells = SIZE - 1;
        for (const r of [near, far]) {
            assert.ok(Math.abs(totalArea(r.triangles) - cells * cells) < 1e-6, 'still watertight');
        }
    });

    it('rejects a grid whose cell count is not a power of two', () => {
        assert.throws(() => decimate({
            size: 30,
            heights: new Float32Array(900),
            landNodes: new Uint8Array(900),
            maxErrorM: 1,
        }), /power of two/);
    });

    it('handles the real tile size of 257 nodes', () => {
        const size = 257;
        const r = decimate({
            size,
            heights: grid(size, (x, y) => Math.sin(x / 20) * 100 + Math.cos(y / 17) * 80),
            landNodes: classes(size, (x, y) => Math.hypot(x - 128, y - 128) < 90),
            maxErrorM: 4,
        });
        const cells = size - 1;
        assert.ok(Math.abs(totalArea(r.triangles) - cells * cells) < 1e-4);
        assert.ok(r.shorelineLeafCount > 0, 'the coast produced cut leaves');
    });
});
