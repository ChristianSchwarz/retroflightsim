/**
 * Bake precomputed vector-cut coastline meshes (`.vcm`, VCM1) for every tile
 * that has both baked DEM (`.pdm`) and OSM coastline vector (`.lvr`) data.
 *
 * `buildVectorCutMesh`'s output is a pure function of a tile's own already-
 * baked files plus fixed manifest constants (see its docstring in
 * `src/script/planet/vectorCutMesh.ts`) — computing it here once and shipping
 * the result eliminates the client-side CDT/clean-pslg cost profiling found
 * to be the dominant contributor to a multi-hundred-millisecond per-tile load
 * delay. Any tile the live CDT would fall back to whole-tile RTIN for is
 * simply left unbaked — the client already treats a missing `.vcm` as "fall
 * back to live computation," so behaviour for those tiles is unchanged.
 *
 * Usage:
 *   node --import tsx tools/bake_vector_cut_mesh.ts [--manifest assets/planet/manifest.json]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ellipsoidSagittaM, rtinErrorForZoom } from '../src/script/planet/lod';
import { decodeLvr } from '../src/script/planet/coastVector';
import { decodePdm } from '../src/script/planet/demTile';
import { PlanetManifest } from '../src/script/planet/manifest';
import { TileKey, tileBounds } from '../src/script/planet/tiling';
import { buildVectorCutMesh, encodeVcm } from '../src/script/planet/vectorCutMesh';

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

function findLvrTiles(assetsDir: string): TileKey[] {
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
                if (!f.endsWith('.lvr')) {
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

function main(): void {
    const { manifestPath } = parseArgs();
    const assetsDir = path.dirname(manifestPath);
    const manifest: PlanetManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const tiles = findLvrTiles(assetsDir);
    console.log(`Found ${tiles.length} tiles with coastline vector data.`);

    let baked = 0;
    let skippedFallback = 0;
    let skippedMissingPdm = 0;
    let errors = 0;
    let bytesWritten = 0;
    const t0 = Date.now();

    for (const id of tiles) {
        const dir = path.join(assetsDir, String(id.z), String(id.x));
        const pdmPath = path.join(dir, `${id.y}.pdm`);
        const lvrPath = path.join(dir, `${id.y}.lvr`);
        if (!fs.existsSync(pdmPath)) {
            skippedMissingPdm++;
            continue;
        }
        try {
            const dem = decodePdm(fs.readFileSync(pdmPath));
            const vec = decodeLvr(fs.readFileSync(lvrPath));
            const bounds = tileBounds(id);
            const levelErrM = manifest.levelGeometricErrorM[id.z] ?? 0;
            const geometricErrorM = Math.max(levelErrM, ellipsoidSagittaM(id) * 0.25);
            const maxErrorM = rtinErrorForZoom(id.z, geometricErrorM);
            const mesh = buildVectorCutMesh({
                bounds,
                size: dem.size,
                heights: dem.heights,
                seaLevel: manifest.seaLevel,
                maxErrorM,
                polygons: vec.polygons,
            });
            if (!mesh) {
                skippedFallback++;
                continue;
            }
            const encoded = encodeVcm(mesh);
            fs.writeFileSync(path.join(dir, `${id.y}.vcm`), encoded);
            bytesWritten += encoded.byteLength;
            baked++;
        } catch (err) {
            errors++;
            console.warn(`  ${id.z}/${id.x}/${id.y}: ${err instanceof Error ? err.message : err}`);
        }
        const done = baked + skippedFallback + errors;
        if (done > 0 && done % 100 === 0) {
            console.log(`  ...${done + skippedMissingPdm}/${tiles.length}`);
        }
    }

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
        `Done in ${dt}s: baked=${baked} fallback-skipped=${skippedFallback} `
        + `missing-pdm=${skippedMissingPdm} errors=${errors} `
        + `totalBytes=${bytesWritten} avgBytes=${baked > 0 ? Math.round(bytesWritten / baked) : 0}`,
    );

    if (baked > 0 && manifest.coastMask) {
        manifest.coastMask.meshPath = '{z}/{x}/{y}.vcm';
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`Updated ${manifestPath} with coastMask.meshPath.`);
    }
}

main();
