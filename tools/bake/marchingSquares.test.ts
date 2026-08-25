import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MIN_AREA, SNAP_EPS, Vec2, cutCell } from './marchingSquares';

function area(tri: Vec2[]): number {
    return Math.abs(
        (tri[1].x - tri[0].x) * (tri[2].y - tri[0].y)
        - (tri[2].x - tri[0].x) * (tri[1].y - tri[0].y),
    ) / 2;
}

function total(tris: Vec2[][]): number {
    return tris.reduce((s, t) => s + area(t), 0);
}

function cornersOf(mask: number): readonly [boolean, boolean, boolean, boolean] {
    return [
        (mask & 1) !== 0,
        (mask & 2) !== 0,
        (mask & 4) !== 0,
        (mask & 8) !== 0,
    ];
}

/** Crossings at the edge midpoints, the geometry-free reference case. */
const MIDPOINTS = [0.5, 0.5, 0.5, 0.5];

describe('marching-squares cell cutting', () => {
    it('tiles the cell exactly in all 16 corner cases', () => {
        for (let mask = 0; mask < 16; mask++) {
            for (const centreIsLand of [true, false]) {
                const r = cutCell({
                    corners: cornersOf(mask),
                    edgeCrossings: MIDPOINTS,
                    centreIsLand,
                });
                const sum = total(r.land) + total(r.water);
                assert.ok(
                    Math.abs(sum - 1) < 1e-9,
                    `mask ${mask} centre=${centreIsLand}: area ${sum} != 1`,
                );
            }
        }
    });

    it('keeps every vertex inside the cell in all 16 cases', () => {
        for (let mask = 0; mask < 16; mask++) {
            const r = cutCell({ corners: cornersOf(mask), edgeCrossings: MIDPOINTS });
            for (const tri of [...r.land, ...r.water]) {
                for (const p of tri) {
                    assert.ok(p.x >= -1e-12 && p.x <= 1 + 1e-12, `mask ${mask} x=${p.x}`);
                    assert.ok(p.y >= -1e-12 && p.y <= 1 + 1e-12, `mask ${mask} y=${p.y}`);
                }
            }
        }
    });

    it('emits no degenerate triangles in any case', () => {
        for (let mask = 0; mask < 16; mask++) {
            const r = cutCell({ corners: cornersOf(mask), edgeCrossings: MIDPOINTS });
            for (const tri of [...r.land, ...r.water]) {
                assert.ok(area(tri) > MIN_AREA, `mask ${mask} degenerate ${JSON.stringify(tri)}`);
            }
        }
    });

    it('tags a uniform cell entirely as one class, as two triangles', () => {
        const allWater = cutCell({ corners: cornersOf(0), edgeCrossings: [] });
        assert.equal(allWater.land.length, 0);
        assert.equal(allWater.water.length, 2);
        assert.ok(Math.abs(total(allWater.water) - 1) < 1e-12);

        const allLand = cutCell({ corners: cornersOf(15), edgeCrossings: [] });
        assert.equal(allLand.water.length, 0);
        assert.equal(allLand.land.length, 2);
        assert.ok(Math.abs(total(allLand.land) - 1) < 1e-12);
    });

    it('gives a single land corner a triangle and the rest to water', () => {
        // c0 land only.
        const r = cutCell({ corners: cornersOf(1), edgeCrossings: MIDPOINTS });
        assert.equal(r.land.length, 1, 'one land triangle');
        assert.ok(Math.abs(total(r.land) - 0.125) < 1e-12, `land area ${total(r.land)}`);
        assert.ok(Math.abs(total(r.water) - 0.875) < 1e-12);
    });

    it('splits an edge-adjacent land pair down the middle', () => {
        // c0 + c1 land: the shoreline runs across the cell, halving it.
        const r = cutCell({ corners: cornersOf(1 | 2), edgeCrossings: MIDPOINTS });
        assert.ok(Math.abs(total(r.land) - 0.5) < 1e-12, `land ${total(r.land)}`);
        assert.ok(Math.abs(total(r.water) - 0.5) < 1e-12);
    });

    describe('saddle cases', () => {
        const saddleLandDiagonal = 1 | 4; // c0 + c2 land, c1 + c3 water

        it('joins the land diagonal when the centre is land', () => {
            const r = cutCell({
                corners: cornersOf(saddleLandDiagonal),
                edgeCrossings: MIDPOINTS,
                centreIsLand: true,
            });
            // Water becomes two isolated corner triangles; land takes the rest.
            assert.equal(r.water.length, 2, 'two isolated water corners');
            assert.ok(Math.abs(total(r.water) - 0.25) < 1e-12, `water ${total(r.water)}`);
            assert.ok(Math.abs(total(r.land) - 0.75) < 1e-12, `land ${total(r.land)}`);
        });

        it('joins the water diagonal when the centre is water', () => {
            const r = cutCell({
                corners: cornersOf(saddleLandDiagonal),
                edgeCrossings: MIDPOINTS,
                centreIsLand: false,
            });
            assert.equal(r.land.length, 2, 'two isolated land corners');
            assert.ok(Math.abs(total(r.land) - 0.25) < 1e-12, `land ${total(r.land)}`);
            assert.ok(Math.abs(total(r.water) - 0.75) < 1e-12, `water ${total(r.water)}`);
        });

        it('resolves both saddle orientations consistently', () => {
            for (const mask of [1 | 4, 2 | 8]) {
                for (const centreIsLand of [true, false]) {
                    const r = cutCell({
                        corners: cornersOf(mask),
                        edgeCrossings: MIDPOINTS,
                        centreIsLand,
                    });
                    const majority = centreIsLand ? r.land : r.water;
                    const minority = centreIsLand ? r.water : r.land;
                    assert.equal(minority.length, 2, `mask ${mask} centre=${centreIsLand}`);
                    assert.ok(total(majority) > total(minority));
                    assert.ok(Math.abs(total(majority) + total(minority) - 1) < 1e-9);
                }
            }
        });

        it('defaults to the c0 class when no centre sample is supplied', () => {
            const r = cutCell({ corners: cornersOf(1 | 4), edgeCrossings: MIDPOINTS });
            // c0 is land, so land takes the majority.
            assert.equal(r.water.length, 2);
            assert.ok(total(r.land) > total(r.water));
        });
    });

    describe('corner snapping', () => {
        it('drops the sliver when a crossing sits on a corner', () => {
            // c0 land; both crossings collapse onto c0 itself.
            const r = cutCell({
                corners: cornersOf(1),
                edgeCrossings: [SNAP_EPS / 2, undefined, undefined, 1 - SNAP_EPS / 2],
            });
            assert.equal(r.land.length, 0, 'the degenerate land corner is dropped');
            assert.ok(Math.abs(total(r.water) - 1) < 1e-9, `water ${total(r.water)}`);
        });

        it('still tiles exactly when a crossing snaps to a corner', () => {
            for (const t of [0, SNAP_EPS / 2, 1 - SNAP_EPS / 2, 1]) {
                const r = cutCell({
                    corners: cornersOf(1 | 2),
                    edgeCrossings: [undefined, t, undefined, t],
                });
                const sum = total(r.land) + total(r.water);
                assert.ok(Math.abs(sum - 1) < 1e-9, `t=${t} area ${sum}`);
            }
        });

        it('never emits a triangle below the minimum area', () => {
            for (let mask = 1; mask < 15; mask++) {
                for (const t of [0, SNAP_EPS / 2, 0.5, 1 - SNAP_EPS / 2, 1]) {
                    const r = cutCell({
                        corners: cornersOf(mask),
                        edgeCrossings: [t, t, t, t],
                    });
                    for (const tri of [...r.land, ...r.water]) {
                        assert.ok(area(tri) > MIN_AREA, `mask ${mask} t=${t}`);
                    }
                }
            }
        });
    });

    it('falls back to the edge midpoint when a crossing is missing', () => {
        const r = cutCell({ corners: cornersOf(1), edgeCrossings: [] });
        const sum = total(r.land) + total(r.water);
        assert.ok(Math.abs(sum - 1) < 1e-9, `area ${sum}`);
        assert.ok(Math.abs(total(r.land) - 0.125) < 1e-12);
    });

    it('places the shoreline where the crossing says, not at the midpoint', () => {
        // c0 land, crossings pushed far along both edges: land grows.
        const near = cutCell({ corners: cornersOf(1), edgeCrossings: [0.1, undefined, undefined, 0.9] });
        const far = cutCell({ corners: cornersOf(1), edgeCrossings: [0.9, undefined, undefined, 0.1] });
        assert.ok(total(far.land) > total(near.land), 'crossing position drives the split');
        assert.ok(Math.abs(total(near.land) - 0.005) < 1e-9, `near ${total(near.land)}`);
        assert.ok(Math.abs(total(far.land) - 0.405) < 1e-9, `far ${total(far.land)}`);
    });
});
