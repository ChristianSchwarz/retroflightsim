/**
 * Bake fully precomputed tile meshes (`.tmb`, TMB1) for every DEM tile.
 *
 * `buildTileMesh`'s full output (positions, normals, indices, tones, groups,
 * bounding sphere) is a pure function of tile id for any tile not under the
 * airbase flatten pad: `maxErrorM` is deterministic given (z, geometricErrorM)
 * via `rtinErrorForZoom`, and the ENU basis is `PLAY_ORIGIN` — a hardcoded
 * constant in `src/script/state/worldLayout.ts`, never recentered at runtime.
 * Baking this once and shipping the result skips the RTIN/CDT/position-
 * transform/skirt computation *and* the worker round-trip entirely at
 * runtime — this session found that pipeline to be the dominant remaining
 * contributor to terrain-load latency even after the coastline mesh
 * (`bake_vector_cut_mesh.ts`) was baked separately.
 *
 * Tiles whose bounds overlap the airbase flatten pad's geographic footprint
 * are deliberately left unbaked — `req.pad` there depends on a DEM-sampled
 * height that this script doesn't reproduce, so those few tiles keep using
 * the live build path unchanged (the client already treats a missing `.tmb`
 * as "fall back to live compute").
 *
 * Reuses `buildTileMesh` directly — no reimplementation, so baked output is
 * bit-identical to what the client would otherwise have computed. When a
 * `.vcm` (baked coastline mesh) exists for a tile, it's decoded and passed
 * in as `precomputedMesh` so this pass doesn't redundantly re-run the CDT
 * the earlier bake already did.
 *
 * Usage:
 *   node --import tsx tools/bake_terrain_mesh.ts [--manifest assets/planet/manifest.json]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { decodeLvr } from '../src/script/planet/coastVector';
import { decodeLwm } from '../src/script/planet/coastMask';
import { decodePdm } from '../src/script/planet/demTile';
import { enuToGeodeticApprox, makeEnuBasis } from '../src/script/planet/geodesy';
import { ellipsoidSagittaM, rtinErrorForZoom } from '../src/script/planet/lod';
import { PlanetManifest } from '../src/script/planet/manifest';
import { buildTileMesh, encodeTmb } from '../src/script/planet/meshBuilder';
import { boundsOverlap, LonLatBounds, TileKey, tileBounds } from '../src/script/planet/tiling';
import { decodeVcm } from '../src/script/planet/vectorCutMesh';
import { AIRBASE_FLATTEN_PAD, AIRBASE_RUNWAY, PLAY_ORIGIN } from '../src/script/state/worldLayout';

function parseArgs(): { manifestPath: string } {
    const args = process.argv.slice(2);
    let manifestPath = 'assets/planet/manifest.json';
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--manifest' && args[i + 1]) {
            manifestPath = args[++i];
        }
    }
    return { manifestPath };
}

function findPdmTiles(assetsDir: string): TileKey[] {
    const out: TileKey[] = [];
    for (const zDir of fs.readdirSync(assetsDir, { withFileTypes: true })) {
        if (!zDir.isDirectory()) {
            continue;
        }
        const z = Number(zDir.name);
        if (!Number.isInteger(z)) {
            continue;
        }
        const zPath = path.join(assetsDir, zDir.name);
        for (const xDir of fs.readdirSync(zPath, { withFileTypes: true })) {
            if (!xDir.isDirectory()) {
                continue;
            }
            const x = Number(xDir.name);
            if (!Number.isInteger(x)) {
                continue;
            }
            const xPath = path.join(zPath, xDir.name);
            for (const f of fs.readdirSync(xPath)) {
                if (!f.endsWith('.pdm')) {
                    continue;
                }
                const y = Number(f.slice(0, -4));
                if (Number.isInteger(y)) {
                    out.push({ z, x, y });
                }
            }
        }
    }
    return out;
}

/** Lon/lat bbox of the airbase flatten pad's ENU footprint, padded by its feather margin. */
function airbaseFlattenPadBounds(basis: ReturnType<typeof makeEnuBasis>): LonLatBounds {
    const pad = AIRBASE_FLATTEN_PAD;
    const margin = pad.featherM;
    const minE = pad.centerX - pad.halfW - margin;
    const maxE = pad.centerX + pad.halfW + margin;
    const minN = pad.centerZ - pad.halfD - margin;
    const maxN = pad.centerZ + pad.halfD + margin;
    const corners = [
        enuToGeodeticApprox(basis, minE, minN),
        enuToGeodeticApprox(basis, maxE, minN),
        enuToGeodeticApprox(basis, minE, maxN),
        enuToGeodeticApprox(basis, maxE, maxN),
    ];
    const lons = corners.map(c => c.lon);
    const lats = corners.map(c => c.lat);
    return {
        west: Math.min(...lons), east: Math.max(...lons),
        south: Math.min(...lats), north: Math.max(...lats),
    };
}

function main(): void {
    const { manifestPath } = parseArgs();
    const assetsDir = path.dirname(manifestPath);
    const manifest: PlanetManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const basis = makeEnuBasis(PLAY_ORIGIN.lat, PLAY_ORIGIN.lon, PLAY_ORIGIN.height);
    const padBounds = airbaseFlattenPadBounds(basis);
    console.log(
        `Airbase flatten pad bounds (excluded from bake): `
        + `west=${padBounds.west.toFixed(5)} east=${padBounds.east.toFixed(5)} `
        + `south=${padBounds.south.toFixed(5)} north=${padBounds.north.toFixed(5)}`,
    );
    void AIRBASE_RUNWAY;

    const tiles = findPdmTiles(assetsDir);
    console.log(`Found ${tiles.length} tiles with DEM data.`);

    let baked = 0;
    let skippedPad = 0;
    let errors = 0;
    let bytesWritten = 0;
    const t0 = Date.now();

    for (const id of tiles) {
        const dir = path.join(assetsDir, String(id.z), String(id.x));
        const bounds = tileBounds(id);
        if (boundsOverlap(bounds, padBounds)) {
            skippedPad++;
            continue;
        }
        try {
            const dem = decodePdm(fs.readFileSync(path.join(dir, `${id.y}.pdm`)));

            const lwmPath = path.join(dir, `${id.y}.lwm`);
            const landMask = fs.existsSync(lwmPath)
                ? decodeLwm(fs.readFileSync(lwmPath)).cells
                : undefined;

            const lvrPath = path.join(dir, `${id.y}.lvr`);
            const polygons = fs.existsSync(lvrPath)
                ? decodeLvr(fs.readFileSync(lvrPath)).polygons
                : undefined;

            const vcmPath = path.join(dir, `${id.y}.vcm`);
            const precomputedMesh = fs.existsSync(vcmPath)
                ? decodeVcm(fs.readFileSync(vcmPath))
                : undefined;

            // Two distinct quantities, matching quadtree.ts's dispatchMeshBuild exactly:
            // maxErrorM (the actual RTIN/CDT error threshold) always uses the
            // zoom-level formula (node.geometricErrorM at runtime); the
            // MeshBuildRequest.geometricErrorM field (used only for skirt
            // depth) prefers the DEM tile's own baked value when present
            // (cached.geometricErrorM || node.geometricErrorM at runtime).
            const levelErrM = manifest.levelGeometricErrorM[id.z] ?? 0;
            const nodeGeometricErrorM = Math.max(levelErrM, ellipsoidSagittaM(id) * 0.25);
            const maxErrorM = rtinErrorForZoom(id.z, nodeGeometricErrorM);
            const geometricErrorM = dem.geometricErrorM || nodeGeometricErrorM;

            const result = buildTileMesh({
                id,
                heights: dem.heights,
                size: dem.size,
                geometricErrorM,
                maxErrorM,
                seaLevel: manifest.seaLevel,
                basis,
                landMask,
                polygons,
                precomputedMesh,
            });

            const encoded = encodeTmb(result);
            fs.writeFileSync(path.join(dir, `${id.y}.tmb`), encoded);
            bytesWritten += encoded.byteLength;
            baked++;
        } catch (err) {
            errors++;
            console.warn(`  ${id.z}/${id.x}/${id.y}: ${err instanceof Error ? err.message : err}`);
        }
        const done = baked + errors;
        if (done > 0 && done % 200 === 0) {
            console.log(`  ...${done + skippedPad}/${tiles.length}`);
        }
    }

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
        `Done in ${dt}s: baked=${baked} skipped-pad=${skippedPad} errors=${errors} `
        + `totalBytes=${bytesWritten} avgBytes=${baked > 0 ? Math.round(bytesWritten / baked) : 0}`,
    );

    if (baked > 0) {
        manifest.bakedMeshPath = '{z}/{x}/{y}.tmb';
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`Updated ${manifestPath} with bakedMeshPath.`);
    }
}

main();
