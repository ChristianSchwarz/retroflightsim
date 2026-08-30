import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    isProgressLine, parseProgress, snapBboxToTiles, splitStream,
} from './areaImport';

/**
 * The lines below are copied from the tools that emit them. If one of those
 * changes its format these tests fail, which is the point: the alternative is
 * a progress bar that silently stops moving.
 */
describe('parseProgress', () => {
    it('reads the mesh bake counter', () => {
        // tools/bake_planet_mesh.ts: `\r  ${i+1}/${n} (${pct}%)  ${mb} MB`
        assert.equal(parseProgress('  123/456 (27.0%)  1.2 MB'), 27);
        assert.equal(parseProgress('  456/456 (100.0%)  12.3 MB'), 100);
    });

    it('reads the cover bake counter', () => {
        // tools/bake_planet_cover.py, same shape.
        assert.equal(parseProgress('  50/1430 (3.5%)  0.4 MB'), 3.5);
    });

    it('reads the fetch coverage line', () => {
        // tools/fetch_planet_dem.py and fetch_cover_sources.py.
        assert.equal(
            parseProgress('  merged Copernicus_DSM_COG_10_N45_00_E007_00_DEM.tif -> 50.1% covered'),
            50.1,
        );
        assert.equal(parseProgress('  merged x -> 100.0% covered'), 100);
    });

    it('reads the DEM sampling counter', () => {
        // tools/bake_planet_dem.py: `  sampling {i+1}/{len(candidates)}`
        assert.equal(parseProgress('  sampling 9/18'), 50);
    });

    it('reads the coastline rasterise counter', () => {
        // tools/bake_osm_coast.py: `  rasterize {i+1}/{len(max_tiles)}`
        assert.equal(parseProgress('  rasterize 12/24'), 50);
    });

    it('ignores lines that carry no progress', () => {
        for (const line of [
            'level 12    18 tiles with land',
            'wrote 38 tiles, 1.6 MB',
            'pyramid     assets/planet: 1386 tiles, z0..12, tileSize 257',
            '',
            'heights   1752.8 .. 4324.6 m, 100.0% land',
        ]) {
            assert.equal(parseProgress(line), undefined, `should ignore: ${line}`);
        }
    });

    it('never reports outside 0..100', () => {
        assert.equal(parseProgress('  1/0 (999.0%)  0 MB'), 100);
        assert.equal(parseProgress('  sampling 5/0'), undefined);
    });
});

describe('isProgressLine', () => {
    it('matches the redrawn counters, which the log replaces rather than stacks', () => {
        assert.equal(isProgressLine('  123/456 (27.0%)  1.2 MB'), true);
        assert.equal(isProgressLine('  sampling 9/18'), true);
        assert.equal(isProgressLine('  rasterize 12/24'), true);
    });

    it('does not match one-off lines that happen to contain a percentage', () => {
        // This one is printed once per source and belongs in the log for good.
        assert.equal(isProgressLine('  merged tile.tif -> 50.1% covered'), false);
        assert.equal(isProgressLine('heights   1752.8 .. 4324.6 m, 100.0% land'), false);
        assert.equal(isProgressLine('level 12    18 tiles with land'), false);
    });
});

describe('splitStream', () => {
    it('splits on newlines and keeps the partial tail', () => {
        const r = splitStream('', 'one\ntwo\nthr');
        assert.deepEqual(r.lines, ['one', 'two']);
        assert.equal(r.tail, 'thr');
    });

    it('joins a line split across two chunks', () => {
        const a = splitStream('', 'hal');
        const b = splitStream(a.tail, 'ves\n');
        assert.deepEqual(a.lines, []);
        assert.deepEqual(b.lines, ['halves']);
    });

    it('treats a bare carriage return as a line break', () => {
        // What bake_planet_mesh.ts and bake_planet_cover.py actually emit:
        // one redrawn progress line, no newline until the stage ends.
        const r = splitStream('', '\r  100/456 (21.9%)  1 MB\r  200/456 (43.9%)  2 MB');
        assert.deepEqual(r.lines, ['  100/456 (21.9%)  1 MB']);
        assert.equal(r.tail, '  200/456 (43.9%)  2 MB');
    });

    it('does not split \r\n into two lines', () => {
        const r = splitStream('', 'one\r\ntwo\r\n');
        assert.deepEqual(r.lines, ['one', 'two']);
        assert.equal(r.tail, '');
    });

    it('drops blank lines', () => {
        assert.deepEqual(splitStream('', 'a\n\n\nb\n').lines, ['a', 'b']);
    });
});

describe('snapBboxToTiles', () => {
    const SPAN = 180 / (1 << 12);
    const onEdge = (v: number, base: number) => {
        const i = (base - v) / SPAN;
        assert.ok(Math.abs(i - Math.round(i)) < 1e-6, `${v} is not a tile edge`);
    };

    it('grows a hand-drawn box out to whole tiles', () => {
        // The second Crimea import, as drawn. Its southern edge fell a third of
        // the way down tile row 1019, and the coast bake rewrote that whole row
        // with the part it had no land for as open sea.
        const [w, s, e, n] = snapBboxToTiles([32.11, 45.204449, 35.02, 46.47]);
        onEdge(w, -180);
        onEdge(e, -180);
        onEdge(s, 90);
        onEdge(n, 90);
        // Outwards only: nothing the user drew is dropped.
        assert.ok(w <= 32.11 && s <= 45.204449 && e >= 35.02 && n >= 46.47);
    });

    it('leaves a box already on tile edges alone', () => {
        // Otherwise every re-import of the same area spreads a tile wider.
        const aligned: [number, number, number, number] =
            [32.0361328125, 45.17578125, 35.068359375, 46.494140625];
        assert.deepEqual(snapBboxToTiles(aligned), aligned);
    });

    it('snaps a western box the same way', () => {
        const [w, s, e, n] = snapBboxToTiles([-113.61, 35.60, -110.79, 37.10]);
        onEdge(w, -180);
        onEdge(e, -180);
        assert.ok(w <= -113.61 && e >= -110.79 && s <= 35.60 && n >= 37.10);
    });
});
