/**
 * Bake draw-ready terrain tiles (.ptm) from the DEM height pyramid and the OSM
 * coastline vectors.
 *
 * Reads the existing pyramid written by tools/bake_planet_dem.py,
 * tools/bake_osm_coast.py and tools/bake_planet_cover.py — .pdm heights, .lvr
 * land polygons, .plc observed cover — and writes one gzip-compressed PTM1
 * tile per land tile, plus index_mesh.bin and a manifest describing the mesh
 * stream.
 *
 * Cover is optional. Without it every land facet falls back to plain grass,
 * which is exactly what the bake produced before cover existed.
 *
 * This is the only place terrain geometry is produced. The runtime fetches,
 * decodes and draws; it never triangulates, so there is no fallback path to
 * keep in sync.
 *
 * Usage:
 *   node --import tsx tools/bake_planet_mesh.ts [options]
 *
 *     --src DIR        input pyramid            (default assets/planet)
 *     --out DIR        output tree              (default assets/terrain)
 *     --max-zoom N     cap detail
 *     --budget N       triangles per tile       (default 6144)
 *     --only z/x/y     bake a single tile (repeatable), for debugging
 *     --limit N        stop after N tiles, for a quick smoke bake
 *     --swatches N     colours in the baked swatch table (default 24)
 *     --bbox w,s,e,n   bake only tiles overlapping this box, and merge the
 *                      index and swatch table with what is already there
 *                      (see tools/README.md, "Adding an area")
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { decodePdm } from '../src/script/terrain/demTile';
import { decodeLvr } from './bake/lvr';
import { PLC_FLAG_REAL_IMAGERY, decodePlc } from './bake/plc';
import {
    HISTOGRAM_BINS, accumulateColors, luminanceWindow, medianCut, newColorHistogram,
} from './bake/swatches';
import { EnuBasis, enuToGeodeticApprox, makeEnuBasis } from '../src/script/terrain/geodesy';
import { AIRBASE_FLATTEN_PAD, PLAY_ORIGIN } from '../src/script/state/worldLayout';
import { buildTile } from './bake/buildTile';
import { TileKey, decodeTileIndex, encodeTileIndex } from './bake/index';
import { CoastPolygon, LonLatBounds } from './bake/shoreline';

// Triangles per tile. Measured on real Canary z12 tiles: the coast alone costs
// ~18k at full resolution and roughly halves per coarsening step, so this buys
// a ~34 m shoreline (minLeafSize 2) and lands near 5,300 triangles per tile.
const DEFAULT_BUDGET = 6144;

/**
 * Colours in the baked swatch table.
 *
 * 24 is the retro end of "enough": a VGA-era scene got by on far fewer, and
 * past about thirty the mode stops reading as quantised and starts looking
 * like a muddier version of raw imagery.
 */
const DEFAULT_SWATCHES = 24;

interface Args {
    src: string;
    out: string;
    maxZoom?: number;
    budget: number;
    only: string[];
    limit?: number;
    swatches: number;
    bbox?: LonLatBounds;
}

/**
 * `west,south,east,north` in degrees.
 *
 * Scopes a bake to one area so a second one can be added without re-meshing
 * everything already there. Every pyramid-wide record the bake writes - the
 * index, the swatch table, the level skirts - is then merged with what the
 * previous bake left rather than replacing it.
 */
function parseBbox(text: string): LonLatBounds {
    const parts = text.split(',').map(v => Number(v.trim()));
    if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) {
        throw new Error(`--bbox wants west,south,east,north, got ${text}`);
    }
    const [west, south, east, north] = parts;
    if (west >= east || south >= north) {
        throw new Error(`--bbox is inside out: ${text}`);
    }
    return { west, south, east, north };
}

function overlaps(a: LonLatBounds, b: LonLatBounds): boolean {
    return !(a.east <= b.west || a.west >= b.east || a.north <= b.south || a.south >= b.north);
}

function parseArgs(argv: string[]): Args {
    const a: Args = {
        src: 'assets/planet',
        out: 'assets/terrain',
        budget: DEFAULT_BUDGET,
        only: [],
        swatches: DEFAULT_SWATCHES,
    };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        const next = () => argv[++i];
        if (k === '--src') a.src = next();
        else if (k === '--out') a.out = next();
        else if (k === '--max-zoom') a.maxZoom = Number(next());
        else if (k === '--budget') a.budget = Number(next());
        else if (k === '--only') a.only.push(next());
        else if (k === '--limit') a.limit = Number(next());
        else if (k === '--swatches') a.swatches = Number(next());
        else if (k === '--bbox') a.bbox = parseBbox(next());
        else throw new Error(`unknown argument ${k}`);
    }
    return a;
}

/**
 * The colour histogram, kept on disk beside the tiles it was built from.
 *
 * The swatch table and the luminance window in the manifest describe *the
 * whole pyramid* - the runtime quantises every tile against them, whichever
 * bake produced it. Derive them from one area's tiles and every other area is
 * snapped to colours taken from ground it does not contain. Since the counts
 * cannot be recovered from the finished .ptm files without decoding all of
 * them, the bake carries them forward instead: 32768 bins, 128 KB, add and
 * re-derive.
 */
const HISTOGRAM_FILE = 'swatch_histogram.bin';

function loadHistogram(dir: string): Uint32Array {
    const p = path.join(dir, HISTOGRAM_FILE);
    if (!fs.existsSync(p)) {
        return newColorHistogram();
    }
    const raw = fs.readFileSync(p);
    if (raw.byteLength !== HISTOGRAM_BINS * 4) {
        console.warn(`  ignoring ${HISTOGRAM_FILE}: ${raw.byteLength} bytes, `
            + `expected ${HISTOGRAM_BINS * 4}`);
        return newColorHistogram();
    }
    return new Uint32Array(raw.buffer, raw.byteOffset, HISTOGRAM_BINS).slice();
}

function saveHistogram(dir: string, histogram: Uint32Array): void {
    fs.writeFileSync(path.join(dir, HISTOGRAM_FILE), Buffer.from(histogram.buffer));
}

/** Geographic quadtree: level z has 2^(z+1) columns by 2^z rows. */
function tileBounds(z: number, x: number, y: number): LonLatBounds {
    const span = 180 / (1 << z);
    const west = -180 + x * span;
    const north = 90 - y * span;
    return { west, south: north - span, east: west + span, north };
}

function tileEdgeMetres(z: number, x: number, y: number): number {
    const b = tileBounds(z, x, y);
    const midLat = (b.south + b.north) / 2;
    return Math.max(
        (b.east - b.west) * 111320 * Math.cos(midLat * Math.PI / 180),
        (b.north - b.south) * 110540,
    );
}

/**
 * Skirt depth per level. The worst vertical mismatch across an LOD seam is
 * bounded by the *coarser* neighbour's geometric error, so the parent level's
 * error is the right term; 2x is margin, and the edge-length term covers
 * ellipsoid sagitta at coarse levels where geometric error is small.
 */
function skirtDepthForLevel(z: number, levelErrors: number[], edgeM: number): number {
    const parentErr = z > 0 ? (levelErrors[z - 1] ?? 0) : (levelErrors[0] ?? 0);
    return Math.max(2 * parentErr, 0.01 * edgeM);
}

/** Interior tolerance: half the level's geometric error, floored so flats collapse. */
function maxErrorForLevel(z: number, levelErrors: number[]): number {
    const err = levelErrors[z] ?? 0;
    return err <= 0 ? 1 : Math.max(1, err * 0.5);
}

/**
 * Max DEM height under the airbase pad footprint.
 *
 * The old runtime sampled this at boot (HeightQuery.sampleMaxUnderPad) and then
 * re-meshed the pad tiles, which was the slowest step in the boot sequence. It
 * is a deterministic function of the DEM and a compile-time pad, so the bake
 * computes it once instead and the runtime never has to.
 */
function computePadHeight(
    src: string,
    manifest: { maxZoom: number; seaLevel?: number },
    basis: EnuBasis,
    pad: { centerX: number; centerZ: number; halfW: number; halfD: number },
): number {
    const seaLevel = manifest.seaLevel ?? 0;
    const cache = new Map<string, ReturnType<typeof decodePdm> | null>();
    const load = (z: number, x: number, y: number) => {
        const key = `${z}/${x}/${y}`;
        if (!cache.has(key)) {
            const p = path.join(src, String(z), String(x), `${y}.pdm`);
            cache.set(key, fs.existsSync(p) ? decodePdm(fs.readFileSync(p)) : null);
        }
        return cache.get(key)!;
    };

    const sampleAt = (lon: number, lat: number): number => {
        for (let z = manifest.maxZoom; z >= 0; z--) {
            const span = 180 / (1 << z);
            const x = Math.floor((lon + 180) / span);
            const y = Math.floor((90 - lat) / span);
            const tile = load(z, x, y);
            if (!tile) {
                continue;
            }
            const b = tileBounds(z, x, y);
            const u = (lon - b.west) / (b.east - b.west);
            const v = (b.north - lat) / (b.north - b.south);
            const n = tile.size;
            const fx = Math.min(n - 1, Math.max(0, u * (n - 1)));
            const fy = Math.min(n - 1, Math.max(0, v * (n - 1)));
            const h = tile.heights[Math.round(fy) * n + Math.round(fx)];
            return Number.isFinite(h) ? h : seaLevel;
        }
        return seaLevel;
    };

    const step = Math.max(10, Math.min(pad.halfW, pad.halfD) / 8);
    let maxH = -Infinity;
    for (let dz = -pad.halfD; dz <= pad.halfD; dz += step) {
        for (let dx = -pad.halfW; dx <= pad.halfW; dx += step) {
            const g = enuToGeodeticApprox(basis, pad.centerX + dx, pad.centerZ + dz, 0);
            const h = sampleAt(g.lon, g.lat);
            if (h > seaLevel && h > maxH) {
                maxH = h;
            }
        }
    }
    return Number.isFinite(maxH) ? maxH : seaLevel;
}

/**
 * Copy the height tiles the runtime actually reads into the output tree.
 *
 * CPU ground queries sample one fixed queryZoom plus an always-resident coarse
 * tier, so only z0..queryZoom is needed — the finest DEM level exists purely as
 * bake input. Copying them makes the output a single self-contained directory
 * that any static file server can serve and that deploys as one unit.
 *
 * The alternative — pointing the manifest back at the input tree — only worked
 * when something happened to be mounting both, which is exactly how a stale dev
 * server turns into a 404 on the manifest.
 */
function copyHeightTiles(src: string, out: string, maxZoom: number): number {
    let bytes = 0;
    for (let z = 0; z <= maxZoom; z++) {
        const zDir = path.join(src, String(z));
        if (!fs.existsSync(zDir)) {
            continue;
        }
        for (const xs of fs.readdirSync(zDir)) {
            const xDir = path.join(zDir, xs);
            if (!fs.statSync(xDir).isDirectory()) {
                continue;
            }
            for (const f of fs.readdirSync(xDir)) {
                if (!f.endsWith('.pdm')) {
                    continue;
                }
                const dstDir = path.join(out, String(z), xs);
                fs.mkdirSync(dstDir, { recursive: true });
                const dst = path.join(dstDir, f);
                fs.copyFileSync(path.join(xDir, f), dst);
                bytes += fs.statSync(dst).size;
            }
        }
    }
    const index = path.join(src, 'index.bin');
    if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(out, 'index.bin'));
        bytes += fs.statSync(index).size;
    }
    return bytes;
}

function walkTiles(src: string, maxZoom: number): Array<{ z: number; x: number; y: number }> {
    const out: Array<{ z: number; x: number; y: number }> = [];
    for (let z = 0; z <= maxZoom; z++) {
        const zDir = path.join(src, String(z));
        if (!fs.existsSync(zDir)) {
            continue;
        }
        for (const xs of fs.readdirSync(zDir)) {
            const xDir = path.join(zDir, xs);
            if (!fs.statSync(xDir).isDirectory()) {
                continue;
            }
            for (const f of fs.readdirSync(xDir)) {
                if (f.endsWith('.pdm')) {
                    out.push({ z, x: Number(xs), y: Number(f.slice(0, -4)) });
                }
            }
        }
    }
    return out;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    const manifestPath = path.join(args.src, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error(`error: no manifest at ${manifestPath}`);
        console.error('Run tools/bake_planet_dem.py first.');
        process.exit(1);
    }
    const src = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const levelErrors: number[] = src.levelGeometricErrorM ?? [];
    const maxZoom = Math.min(args.maxZoom ?? src.maxZoom, src.maxZoom);
    const basis = makeEnuBasis(PLAY_ORIGIN.lat, PLAY_ORIGIN.lon, PLAY_ORIGIN.height);
    // One airbase pad per baked area, so every area has somewhere flat to put
    // a runway. Each is evaluated in a frame centred on itself: the pad is an
    // axis-aligned box in ENU, and ENU axes turn with position, so a box laid
    // out in the bake's frame would sit skewed against the local north the
    // runtime flattens against. Home's frame is the bake's frame, so its pad
    // is unchanged to the last decimal.
    const areas: Array<{ name: string; west: number; south: number; east: number; north: number }> =
        src.areas?.length ? src.areas : [{ name: 'terrain', ...src.coverage }];
    const pads = areas.map(area => {
        const home = PLAY_ORIGIN.lon >= area.west && PLAY_ORIGIN.lon <= area.east
            && PLAY_ORIGIN.lat >= area.south && PLAY_ORIGIN.lat <= area.north;
        const lat = home ? PLAY_ORIGIN.lat : (area.south + area.north) / 2;
        const lon = home ? PLAY_ORIGIN.lon : (area.west + area.east) / 2;
        const padBasis = home ? basis : makeEnuBasis(lat, lon, 0);
        const heightMsl = computePadHeight(args.src, src, padBasis, AIRBASE_FLATTEN_PAD);
        console.log(`pad ${area.name}: ${lat.toFixed(4)}, ${lon.toFixed(4)} -> `
            + `${heightMsl.toFixed(2)} m MSL${home ? ' (home)' : ''}`);
        return { ...AIRBASE_FLATTEN_PAD, lat, lon, basis: padBasis, heightMsl };
    });

    let tiles = args.only.length > 0
        ? args.only.map(s => {
            const [z, x, y] = s.split('/').map(Number);
            return { z, x, y };
        })
        : walkTiles(args.src, maxZoom);
    if (args.bbox !== undefined) {
        const before = tiles.length;
        const box = args.bbox;
        tiles = tiles.filter(t => overlaps(tileBounds(t.z, t.x, t.y), box));
        console.log(`bbox: ${tiles.length} of ${before} tiles overlap it; `
            + `${before - tiles.length} left alone`);
    }
    tiles.sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y);
    if (args.limit !== undefined) {
        tiles = tiles.slice(0, args.limit);
    }

    console.log(`baking ${tiles.length} tiles from ${args.src} -> ${args.out} `
        + `(z0..${maxZoom}, budget ${args.budget})`);

    fs.mkdirSync(args.out, { recursive: true });
    const written: Array<{ z: number; x: number; y: number }> = [];
    const levelSkirt: number[] = [];
    let totalBytes = 0;
    let totalTris = 0;
    let maxTris = 0;
    let coarsenedCoast = 0;
    let coveredTiles = 0;
    let imageryTiles = 0;
    const colorHistogram = args.bbox !== undefined
        ? loadHistogram(args.out)
        : newColorHistogram();
    const leafHistogram = new Map<number, number>();
    const t0 = Date.now();

    for (let i = 0; i < tiles.length; i++) {
        const { z, x, y } = tiles[i];
        const stem = path.join(args.src, String(z), String(x), String(y));
        const pdmPath = `${stem}.pdm`;
        if (!fs.existsSync(pdmPath)) {
            continue;
        }
        const dem = decodePdm(fs.readFileSync(pdmPath));
        let polygons: CoastPolygon[] | undefined;
        const lvrPath = `${stem}.lvr`;
        if (fs.existsSync(lvrPath)) {
            polygons = decodeLvr(fs.readFileSync(lvrPath)).polygons as CoastPolygon[];
        }
        let cover: ReturnType<typeof decodePlc> | undefined;
        const plcPath = `${stem}.plc`;
        if (fs.existsSync(plcPath)) {
            cover = decodePlc(fs.readFileSync(plcPath));
            coveredTiles++;
            if (cover.flags & PLC_FLAG_REAL_IMAGERY) {
                imageryTiles++;
            }
        }

        const bounds = tileBounds(z, x, y);
        const edgeM = tileEdgeMetres(z, x, y);
        const skirtDepthM = skirtDepthForLevel(z, levelErrors, edgeM);
        levelSkirt[z] = skirtDepthM;
        // Simplify the coast to roughly the interior tolerance, in cells.
        const cellM = edgeM / (dem.size - 1);
        const simplifyCells = cellM > 0 ? Math.min(2, (maxErrorForLevel(z, levelErrors) / cellM)) : 0;

        const r = buildTile({
            id: { z, x, y },
            bounds,
            heights: dem.heights,
            size: dem.size,
            seaLevel: src.seaLevel ?? 0,
            maxErrorM: maxErrorForLevel(z, levelErrors),
            skirtDepthM,
            basis,
            polygons,
            simplifyCells,
            triangleBudget: args.budget,
            pads,
            cover,
        });
        // Only tiles carrying real imagery feed the swatch table. A tile
        // without it is painted in ESA's landcover map colours - a scarlet for
        // built-up, a lemon for grassland - which are legible on a map and
        // absurd on terrain, and letting them into the table hands real ground
        // the nearest of *those*.
        if (cover && (cover.flags & PLC_FLAG_REAL_IMAGERY)) {
            accumulateColors(colorHistogram, r.landColors);
        }

        const outPath = path.join(args.out, String(z), String(x), `${y}.ptm`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const gz = zlib.gzipSync(r.bytes, { level: 9 });
        fs.writeFileSync(outPath, gz);

        written.push({ z, x, y });
        totalBytes += gz.byteLength;
        totalTris += r.triangleCount;
        maxTris = Math.max(maxTris, r.triangleCount);
        if (r.minLeafSize > 1) {
            coarsenedCoast++;
        }
        leafHistogram.set(r.minLeafSize, (leafHistogram.get(r.minLeafSize) ?? 0) + 1);

        if ((i + 1) % 100 === 0 || i + 1 === tiles.length) {
            const pct = (((i + 1) / tiles.length) * 100).toFixed(1);
            process.stdout.write(
                `\r  ${i + 1}/${tiles.length} (${pct}%)  ${(totalBytes / 1048576).toFixed(1)} MB`,
            );
        }
    }
    process.stdout.write('\n');

    const heightMaxZoom = Math.min(11, src.maxZoom);
    const heightBytes = copyHeightTiles(args.src, args.out, heightMaxZoom);
    console.log(`copied height tiles z0..${heightMaxZoom}: `
        + `${(heightBytes / 1048576).toFixed(1)} MB`);

    // Counts from every bake so far, this one included, so the table describes
    // the pyramid rather than the last area added to it.
    saveHistogram(args.out, colorHistogram);
    const swatches = medianCut(colorHistogram, args.swatches);
    const luminance = luminanceWindow(colorHistogram);
    console.log(`cover: ${coveredTiles}/${written.length} tiles, `
        + `${imageryTiles} with real imagery, ${swatches.length} swatches`);
    console.log(`  luminance: mid ${luminance.mid.toFixed(3)}, `
        + `spread ${luminance.spread.toFixed(3)}`);

    // The index has to list every .ptm on disk, not just the ones this run
    // produced. A scoped bake that rewrote it from `written` alone would
    // unlist every other area, and "not in the index" means "ocean, draw a
    // patch" to the runtime - so the rest of the world would quietly flatten.
    const indexPath = path.join(args.out, 'index_mesh.bin');
    const present = new Map<string, TileKey>();
    if (args.bbox !== undefined && fs.existsSync(indexPath)) {
        for (const k of decodeTileIndex(fs.readFileSync(indexPath))) {
            present.set(`${k.z}/${k.x}/${k.y}`, k);
        }
    }
    const carried = present.size;
    for (const k of written) {
        present.set(`${k.z}/${k.x}/${k.y}`, k);
    }
    const all = [...present.values()];
    if (carried > 0) {
        console.log(`index: ${written.length} baked + ${carried} carried `
            + `-> ${all.length} tiles`);
    }

    const minZoom = all.length > 0 ? Math.min(...all.map(t => t.z)) : 0;
    const maxWritten = all.length > 0 ? Math.max(...all.map(t => t.z)) : 0;
    fs.writeFileSync(indexPath, encodeTileIndex(all, minZoom, maxWritten));

    // Same for the per-level skirt depths: a scoped bake only touched the
    // levels it had tiles on, and the rest still need their previous value.
    const previousManifest = args.bbox !== undefined
        && fs.existsSync(path.join(args.out, 'manifest.json'))
        ? JSON.parse(fs.readFileSync(path.join(args.out, 'manifest.json'), 'utf8'))
        : undefined;
    const previousSkirt: number[] = previousManifest?.mesh?.levelSkirtDepthM ?? [];
    for (let z = 0; z <= maxWritten; z++) {
        if (levelSkirt[z] === undefined && previousSkirt[z] !== undefined) {
            levelSkirt[z] = previousSkirt[z];
        }
    }

    const outManifest = {
        version: 4,
        scheme: 'retro-terrain/1',
        ellipsoid: 'WGS84',
        seaLevel: src.seaLevel ?? 0,
        coverage: src.coverage,
        // Carried through from the height pyramid. `coverage` is the union box
        // of everything baked, which cannot name the individual areas inside
        // it, and naming them is what lets the runtime offer one to fly to.
        areas: src.areas ?? [],
        enuOrigin: { lat: PLAY_ORIGIN.lat, lon: PLAY_ORIGIN.lon, height: PLAY_ORIGIN.height },
        mesh: {
            path: '{z}/{x}/{y}.ptm',
            indexPath: 'index_mesh.bin',
            minZoom,
            maxZoom: maxWritten,
            encoding: 'PTM1',
            transport: 'gzip',
            triangleBudget: args.budget,
            levelGeometricErrorM: levelErrors.slice(0, maxWritten + 1),
            levelSkirtDepthM: Array.from(
                { length: maxWritten + 1 },
                (_, z) => levelSkirt[z] ?? 0,
            ),
            swatches,
            luminance,
        },
        height: {
            path: '{z}/{x}/{y}.pdm',
            indexPath: 'index.bin',
            tileSize: src.tileSize,
            encoding: src.encoding,
            compression: src.compression,
            nodata: src.nodata,
            minZoom: src.minZoom,
            maxZoom: heightMaxZoom,
            queryZoom: heightMaxZoom,
            coarseZoom: 7,
        },
        flattenPads: pads.map(p => ({
            lat: p.lat,
            lon: p.lon,
            halfW: p.halfW,
            halfD: p.halfD,
            featherM: p.featherM,
            heightMsl: p.heightMsl,
        })),
        bake: {
            tool: 'bake_planet_mesh',
            version: '1.0.0',
            utc: new Date().toISOString(),
        },
    };
    fs.writeFileSync(
        path.join(args.out, 'manifest.json'),
        `${JSON.stringify(outManifest, null, 2)}\n`,
    );

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`wrote ${written.length} tiles, ${(totalBytes / 1048576).toFixed(1)} MB in ${secs}s`);
    if (written.length > 0) {
        console.log(`  triangles: mean ${Math.round(totalTris / written.length)}, max ${maxTris}`);
        console.log(`  mean tile: ${Math.round(totalBytes / written.length / 1024)} KB gzip`);
        const pct = ((coarsenedCoast / written.length) * 100).toFixed(0);
        console.log(`  coast coarsened on ${coarsenedCoast}/${written.length} tiles (${pct}%)`);
        const leaves = [...leafHistogram.entries()].sort((a, b) => a[0] - b[0]);
        console.log(`  shoreline leaf size: `
            + leaves.map(([k, v]) => `${k}cell x${v}`).join(', '));
    }
}

main();
