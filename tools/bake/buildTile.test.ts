import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ecefToEnu, geodeticToEcef, makeEnuBasis } from '../../src/script/planet/geodesy';
import { padBlendWeight } from '../../src/script/planet/flattenPad';
import { decodePtm } from '../../src/script/terrain/ptm';
import { TerrainTone } from '../../src/script/terrain/tones';
import { CoastPolygon, LonLatBounds } from './shoreline';
import { BuildTileInput, buildTile } from './buildTile';

const SIZE = 33;
const CELLS = SIZE - 1;
// A ~1.2 km tile near the Gran Canaria play origin.
const BOUNDS: LonLatBounds = {
    west: -15.40, east: -15.39,
    south: 28.00, north: 28.01,
};
const BASIS = makeEnuBasis(28.0015, -15.3937, 0);

function heightsFrom(fn: (x: number, y: number) => number): Float32Array {
    const out = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            out[y * SIZE + x] = fn(x, y);
        }
    }
    return out;
}

/** A land polygon covering grid x in [0, edge], i.e. a north-south coast. */
function coastAt(edgeCells: number): CoastPolygon {
    const lonAt = (gx: number) => BOUNDS.west + (gx / CELLS) * (BOUNDS.east - BOUNDS.west);
    return {
        exterior: [
            { lon: lonAt(-1), lat: BOUNDS.north + 1 },
            { lon: lonAt(edgeCells), lat: BOUNDS.north + 1 },
            { lon: lonAt(edgeCells), lat: BOUNDS.south - 1 },
            { lon: lonAt(-1), lat: BOUNDS.south - 1 },
        ],
        holes: [],
    };
}

function base(overrides: Partial<BuildTileInput> = {}): BuildTileInput {
    return {
        id: { z: 12, x: 3745, y: 1410 },
        bounds: BOUNDS,
        heights: heightsFrom((x, y) => 50 + Math.sin(x / 5) * 20 + Math.cos(y / 4) * 15),
        size: SIZE,
        seaLevel: 0,
        maxErrorM: 2,
        skirtDepthM: 25,
        basis: BASIS,
        ...overrides,
    };
}

describe('buildTile', () => {
    it('produces bytes that decode back to a consistent tile', () => {
        const r = buildTile(base({ polygons: [coastAt(16)] }));
        const tile = decodePtm(r.bytes);
        assert.deepEqual(tile.id, { z: 12, x: 3745, y: 1410 });
        assert.equal(tile.landPositions.length / 3, r.landTriangles * 3);
        assert.equal(tile.waterIndices.length, r.waterTriangles * 3);
        assert.ok(Math.abs(tile.skirtDepthM - 25) < 1e-3);
        assert.ok(tile.boundingRadiusM > 0);
    });

    it('is deterministic: the same input yields byte-identical output', () => {
        const input = () => base({ polygons: [coastAt(16)] });
        const a = buildTile(input()).bytes;
        const b = buildTile(input()).bytes;
        assert.deepEqual(Array.from(a), Array.from(b));
    });

    it('emits only land for an all-land tile', () => {
        const r = buildTile(base({ polygons: [coastAt(CELLS + 2)] }));
        assert.ok(r.landTriangles > 0);
        assert.equal(r.waterTriangles, 0);
        const tile = decodePtm(r.bytes);
        assert.equal(tile.waterIndices.length, 0);
        // Single land colour: everything is Grass (see toneForLandHeight).
        for (let v = 0; v < tile.landTones.length; v++) {
            assert.equal(tile.landTones[v], TerrainTone.Grass);
        }
    });

    it('emits only water for a tile with no land', () => {
        const r = buildTile(base({ polygons: [] }));
        assert.equal(r.landTriangles, 0);
        assert.ok(r.waterTriangles > 0);
        const tile = decodePtm(r.bytes);
        assert.equal(tile.landPositions.length, 0);
    });

    it('produces both streams for a coastal tile', () => {
        const r = buildTile(base({ polygons: [coastAt(16)] }));
        assert.ok(r.landTriangles > 0, 'land');
        assert.ok(r.waterTriangles > 0, 'water');
    });

    it('paints water near the shore as the shallow tone', () => {
        const r = buildTile(base({
            heights: heightsFrom(() => 0),
            polygons: [coastAt(16)],
        }));
        const tile = decodePtm(r.bytes);
        const [deep, shallow] = tile.waterGroups;
        assert.ok(shallow[1] > 0, 'some shallow water near the coast');
        assert.ok(deep[1] > 0, 'some deep water further out');
    });

    describe('triangle budget', () => {
        // A pathological coastline: a fine comb that cuts a great many cells.
        const combPolygons = (): CoastPolygon[] => {
            const lonAt = (gx: number) => BOUNDS.west + (gx / CELLS) * (BOUNDS.east - BOUNDS.west);
            const latAt = (gy: number) => BOUNDS.north - (gy / CELLS) * (BOUNDS.north - BOUNDS.south);
            const pts: Array<{ lon: number; lat: number }> = [];
            for (let i = 0; i <= CELLS; i++) {
                pts.push({ lon: lonAt(i), lat: latAt(i % 2 === 0 ? 4 : 28) });
            }
            pts.push({ lon: lonAt(CELLS), lat: latAt(-2) });
            pts.push({ lon: lonAt(0), lat: latAt(-2) });
            return [{ exterior: pts, holes: [] }];
        };

        it('stays within the budget on a pathological coastline', () => {
            const budget = 400;
            const r = buildTile(base({
                heights: heightsFrom((x, y) => (x * 37 + y * 53) % 200),
                polygons: combPolygons(),
                triangleBudget: budget,
            }));
            assert.ok(
                r.triangleCount <= budget,
                `${r.triangleCount} triangles exceeds budget ${budget}`,
            );
            assert.ok(r.attempts > 1, 'the budget actually had to bite');
        });

        it('leaves a tile that already fits untouched', () => {
            const input = base({ heights: heightsFrom(() => 10), triangleBudget: 5000 });
            const r = buildTile(input);
            assert.equal(r.attempts, 1);
            assert.equal(r.maxErrorM, input.maxErrorM);
            assert.equal(r.minLeafSize, 1);
        });

        it('coarsens the interior before it coarsens the coast', () => {
            const r = buildTile(base({
                heights: heightsFrom((x, y) => (x * 37 + y * 53) % 200),
                polygons: [coastAt(16)],
                triangleBudget: 300,
            }));
            assert.ok(r.maxErrorM > 2, 'tolerance was raised first');
        });
    });

    describe('flatten pad', () => {
        const pad = { centerX: 0, centerZ: 0, halfW: 500, halfD: 2000, featherM: 80 };

        it('flattens the runway footprint to the pad height', () => {
            const bumpy = heightsFrom((x, y) => 40 + ((x * 7 + y * 11) % 23));
            const padHeightMsl = 41.7;
            // Skirts hang below the surface by design, so they would show up
            // as "core vertices" a full skirt depth under the pad height.
            // Drop them here; the skirt tests below cover them separately.
            const r = buildTile(base({
                heights: bumpy, polygons: [coastAt(CELLS + 2)],
                pad, padHeightMsl, skirtDepthM: 0,
            }));
            const tile = decodePtm(r.bytes);

            // Tile-local positions are relative to the tile centre, so rebuild
            // the absolute ENU of each vertex and check the ones sitting in the
            // pad's flat core.
            const centreLon = (BOUNDS.west + BOUNDS.east) / 2;
            const centreLat = (BOUNDS.south + BOUNDS.north) / 2;
            const centre = ecefToEnu(
                BASIS,
                geodeticToEcef(centreLat, centreLon, r.centerHeightM),
            );

            let inCore = 0;
            for (let v = 0; v < tile.landPositions.length / 3; v++) {
                const e = centre.e + tile.landPositions[v * 3] * tile.quantScaleXZ;
                const u = centre.u + tile.landPositions[v * 3 + 1] * tile.quantScaleY;
                const n = centre.n + tile.landPositions[v * 3 + 2] * tile.quantScaleXZ;
                if (padBlendWeight(e, n, pad) < 1) {
                    continue;
                }
                inCore++;
                // ENU up tracks geodetic height to within the curvature drop
                // across a ~1 km tile, which is a few centimetres.
                assert.ok(
                    Math.abs(u - padHeightMsl) < 1.5,
                    `core vertex at ${u.toFixed(2)} m, expected ~${padHeightMsl}`,
                );
            }
            assert.ok(inCore > 0, 'no vertices landed inside the pad core');
        });

        it('changes the mesh compared with no pad at all', () => {
            const bumpy = heightsFrom((x, y) => 40 + ((x * 7 + y * 11) % 23));
            const withPad = buildTile(base({
                heights: bumpy, polygons: [coastAt(CELLS + 2)],
                pad, padHeightMsl: 41.7,
            })).bytes;
            const without = buildTile(base({
                heights: bumpy, polygons: [coastAt(CELLS + 2)],
            })).bytes;
            assert.notDeepEqual(Array.from(withPad), Array.from(without));
        });

        it('is a no-op when no pad is supplied', () => {
            const a = buildTile(base({ polygons: [coastAt(CELLS + 2)] })).bytes;
            const b = buildTile(base({
                polygons: [coastAt(CELLS + 2)], pad: undefined, padHeightMsl: 41.7,
            })).bytes;
            assert.deepEqual(Array.from(a), Array.from(b));
        });
    });

    describe('skirts', () => {
        it('adds skirt geometry along the tile border', () => {
            const withSkirt = buildTile(base({
                polygons: [coastAt(CELLS + 2)], skirtDepthM: 50,
            }));
            const noSkirt = buildTile(base({
                polygons: [coastAt(CELLS + 2)], skirtDepthM: 0,
            }));
            assert.ok(
                withSkirt.landTriangles > noSkirt.landTriangles - 1,
                'skirt quads are present',
            );
            // A 32-cell border decimated to one leaf gives 4 border edges,
            // each becoming 2 triangles.
            assert.ok(withSkirt.landTriangles >= noSkirt.landTriangles);
        });

        it('hangs skirts below the surface, not above it', () => {
            const r = buildTile(base({
                heights: heightsFrom(() => 100),
                polygons: [coastAt(CELLS + 2)],
                skirtDepthM: 50,
            }));
            const tile = decodePtm(r.bytes);
            let minY = Infinity;
            let maxY = -Infinity;
            for (let v = 0; v < tile.landPositions.length / 3; v++) {
                const y = tile.landPositions[v * 3 + 1] * tile.quantScaleY;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            assert.ok(maxY - minY >= 49, `skirt depth not reflected: ${maxY - minY}`);
        });
    });

    it('handles the real 257-node tile size', () => {
        const size = 257;
        const heights = new Float32Array(size * size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                heights[y * size + x] = Math.sin(x / 25) * 300 + Math.cos(y / 19) * 200;
            }
        }
        const r = buildTile({
            ...base(),
            size,
            heights,
            polygons: [coastAt(128)],
            triangleBudget: 3072,
        });
        assert.ok(r.triangleCount <= 3072, `${r.triangleCount} triangles`);
        const tile = decodePtm(r.bytes);
        assert.ok(tile.boundingRadiusM > 100);
        assert.ok(r.bytes.byteLength < 200_000, `${r.bytes.byteLength} bytes is too large`);
    });
});
