/**
 * Composes one baked tile: DEM heights + OSM polygons in, PTM1 bytes out.
 *
 * Pipeline, in order:
 *   1. classify nodes and locate shoreline crossings   (shoreline.ts)
 *   2. decimate into a restricted quadtree and cut the coast  (decimate.ts)
 *   3. enforce the triangle budget by coarsening and retrying
 *   4. project grid space -> geodetic -> ECEF -> tile-local ENU
 *   5. apply the airbase flatten pad and the ocean depth bias
 *   6. classify tones, build skirts, split into the land and water streams
 *   7. encode                                              (ptm.ts)
 *
 * Everything the output depends on is fixed at build time, which is the whole
 * point: there is no runtime equivalent of this file, and no fallback path.
 */

import { EnuBasis, Ecef, Enu, ecefToEnu, geodeticToEcef } from '../../src/script/planet/geodesy';
import { FlattenPadSpec, applyFlattenPad } from '../../src/script/planet/flattenPad';
import { TerrainTone } from '../../src/script/terrain/tones';
import { PtmTileId, encodePtm } from '../../src/script/terrain/ptm';
import { GridTriangle, decimate } from './decimate';
import { CoastPolygon, LonLatBounds, buildShoreline } from './shoreline';

/** Heights at or below seaLevel + this are open water. Matches the old bake. */
export const WATER_HEIGHT_EPS_M = 0.5;

/**
 * Open water is dropped this far so a coastal land/water edge cannot z-fight
 * into sky-coloured sparkles along the beach line.
 */
export const WATER_DEPTH_BIAS_M = 0.5;

/** Water within this distance of the shore is painted as the shallow tone. */
export const SHALLOW_WATER_COAST_M = 80;

/** Skirt tops sit this far below the surface so they cannot z-fight it. */
export const SKIRT_TOP_EPS_M = 0.05;

export interface BuildTileInput {
    id: PtmTileId;
    bounds: LonLatBounds;
    /** Row-major heights, `size * size`. */
    heights: Float32Array;
    size: number;
    seaLevel: number;
    /** Vertical tolerance for interior decimation. */
    maxErrorM: number;
    skirtDepthM: number;
    basis: EnuBasis;
    polygons?: CoastPolygon[];
    /** Douglas-Peucker tolerance in grid cells. */
    simplifyCells?: number;
    minLeafSize?: number;
    /** Coarsen and retry until the tile fits. Omit to disable. */
    triangleBudget?: number;
    pad?: FlattenPadSpec;
    padHeightMsl?: number;
}

export interface BuildTileResult {
    bytes: Uint8Array;
    triangleCount: number;
    landTriangles: number;
    waterTriangles: number;
    /** Tolerance actually used after any budget coarsening. */
    maxErrorM: number;
    minLeafSize: number;
    /** How many budget retries were needed. */
    attempts: number;
    centerHeightM: number;
}

const _ecef: Ecef = { x: 0, y: 0, z: 0 };
const _enu: Enu = { e: 0, n: 0, u: 0 };

/**
 * Multi-source chamfer distance (in cells) from every land node.
 * Used to decide which water is shallow enough for the lighter tone.
 */
function landDistanceCells(landNodes: Uint8Array, size: number): Float32Array {
    const INF = 1e9;
    const d = new Float32Array(size * size).fill(INF);
    for (let i = 0; i < d.length; i++) {
        if (landNodes[i]) {
            d[i] = 0;
        }
    }
    const relax = (i: number, j: number, w: number) => {
        const v = d[j] + w;
        if (v < d[i]) {
            d[i] = v;
        }
    };
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = y * size + x;
            if (x > 0) relax(i, i - 1, 1);
            if (y > 0) relax(i, i - size, 1);
            if (x > 0 && y > 0) relax(i, i - size - 1, Math.SQRT2);
            if (x + 1 < size && y > 0) relax(i, i - size + 1, Math.SQRT2);
        }
    }
    for (let y = size - 1; y >= 0; y--) {
        for (let x = size - 1; x >= 0; x--) {
            const i = y * size + x;
            if (x + 1 < size) relax(i, i + 1, 1);
            if (y + 1 < size) relax(i, i + size, 1);
            if (x + 1 < size && y + 1 < size) relax(i, i + size + 1, Math.SQRT2);
            if (x > 0 && y + 1 < size) relax(i, i + size - 1, Math.SQRT2);
        }
    }
    return d;
}

export function buildTile(input: BuildTileInput): BuildTileResult {
    const { size, heights, bounds, seaLevel, basis } = input;
    const cells = size - 1;

    const shoreline = buildShoreline({
        polygons: input.polygons ?? [],
        bounds,
        size,
        simplifyCells: input.simplifyCells,
    });

    // --- 3. budget-constrained decimation ---------------------------------
    let maxErrorM = input.maxErrorM;
    let minLeafSize = input.minLeafSize ?? 1;
    let attempts = 0;
    let tris: GridTriangle[] = [];
    for (;;) {
        attempts++;
        const r = decimate({
            size,
            heights,
            landNodes: shoreline.landNodes,
            maxErrorM,
            minLeafSize,
            edgeCrossing: shoreline.edgeCrossing,
            centreIsLand: shoreline.centreIsLand,
        });
        tris = r.triangles;
        const budget = input.triangleBudget;
        if (!budget || tris.length <= budget || minLeafSize >= cells) {
            break;
        }
        // Interior first: doubling the tolerance is cheap and preserves the
        // coast. Only once that stops helping do we coarsen the shoreline,
        // which is the visible cost.
        if (attempts % 2 === 1) {
            maxErrorM = maxErrorM > 0 ? maxErrorM * 2 : 1;
        } else {
            minLeafSize = Math.min(cells, minLeafSize * 2);
        }
        if (attempts > 32) {
            break;
        }
    }

    // --- 4/5. projection, pad, depth bias ---------------------------------
    const lonSpan = bounds.east - bounds.west;
    const latSpan = bounds.north - bounds.south;
    const distCells = landDistanceCells(shoreline.landNodes, size);
    // Metres per cell, for the shallow-water distance test. Latitude spacing
    // is used because it does not shrink with longitude towards the poles.
    const metresPerCell = Math.max(1e-6, (latSpan / cells) * 110540);

    const sampleHeight = (gx: number, gy: number): number => {
        const fx = Math.min(cells, Math.max(0, gx));
        const fy = Math.min(cells, Math.max(0, gy));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(cells, x0 + 1);
        const y1 = Math.min(cells, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const h00 = heights[y0 * size + x0];
        const h10 = heights[y0 * size + x1];
        const h01 = heights[y1 * size + x0];
        const h11 = heights[y1 * size + x1];
        let sum = 0;
        let w = 0;
        const add = (h: number, weight: number) => {
            if (Number.isFinite(h) && weight > 0) {
                sum += h * weight;
                w += weight;
            }
        };
        add(h00, (1 - tx) * (1 - ty));
        add(h10, tx * (1 - ty));
        add(h01, (1 - tx) * ty);
        add(h11, tx * ty);
        return w > 0 ? sum / w : seaLevel;
    };

    const sampleDist = (gx: number, gy: number): number => {
        const x = Math.min(size - 1, Math.max(0, Math.round(gx)));
        const y = Math.min(size - 1, Math.max(0, Math.round(gy)));
        return distCells[y * size + x] * metresPerCell;
    };

    /** Grid -> ENU (absolute), including the pad and the water rules. */
    const project = (gx: number, gy: number, land: boolean): Enu => {
        const lon = bounds.west + (gx / cells) * lonSpan;
        const lat = bounds.north - (gy / cells) * latSpan;
        let h = land ? sampleHeight(gx, gy) : seaLevel;
        if (!Number.isFinite(h)) {
            h = seaLevel;
        }
        if (land) {
            // The pad blend is in ENU, so we need a first ENU pass to know
            // where we are before we can decide how much to flatten.
            geodeticToEcef(lat, lon, h, _ecef);
            ecefToEnu(basis, _ecef, _enu);
            h = applyFlattenPad(h, _enu.e, _enu.n, input.pad, input.padHeightMsl);
        } else {
            h -= WATER_DEPTH_BIAS_M;
        }
        geodeticToEcef(lat, lon, h, _ecef);
        ecefToEnu(basis, _ecef, _enu);
        return { e: _enu.e, n: _enu.n, u: _enu.u };
    };

    // Tile centre, which is what the runtime will place the mesh at.
    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < heights.length; i++) {
        const h = heights[i];
        if (Number.isFinite(h)) {
            if (h < minH) minH = h;
            if (h > maxH) maxH = h;
        }
    }
    if (!Number.isFinite(minH)) {
        minH = seaLevel;
        maxH = seaLevel;
    }
    const centerHeightM = (minH + maxH) / 2;
    const centreLon = (bounds.west + bounds.east) / 2;
    const centreLat = (bounds.south + bounds.north) / 2;
    geodeticToEcef(centreLat, centreLon, centerHeightM, _ecef);
    const centre = ecefToEnu(basis, _ecef, { e: 0, n: 0, u: 0 });

    // --- 6. tones, streams, skirts ----------------------------------------
    const landPos: number[] = [];
    const landNrm: number[] = [];
    const landTone: number[] = [];

    const waterPos: number[] = [];
    const waterIdx: number[] = [];
    const waterTone: number[] = [];
    const waterKey = new Map<string, number>();

    const waterVertex = (gx: number, gy: number): number => {
        const key = `${gx.toFixed(4)},${gy.toFixed(4)}`;
        let idx = waterKey.get(key);
        if (idx !== undefined) {
            return idx;
        }
        const p = project(gx, gy, false);
        idx = waterPos.length / 3;
        waterPos.push(p.e - centre.e, p.u - centre.u, p.n - centre.n);
        waterKey.set(key, idx);
        return idx;
    };

    const pushLandTriangle = (
        a: Enu, b: Enu, c: Enu, tone: TerrainTone,
    ) => {
        const ax = a.e - centre.e, ay = a.u - centre.u, az = a.n - centre.n;
        const bx = b.e - centre.e, by = b.u - centre.u, bz = b.n - centre.n;
        const cx = c.e - centre.e, cy = c.u - centre.u, cz = c.n - centre.n;
        let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
        let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        const len = Math.hypot(nx, ny, nz);
        if (len > 0) {
            nx /= len; ny /= len; nz /= len;
        } else {
            nx = 0; ny = 1; nz = 0;
        }
        // Terrain is drawn double-sided, but keep normals pointing up so the
        // fixed-sun shading is stable.
        if (ny < 0) {
            nx = -nx; ny = -ny; nz = -nz;
        }
        landPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        landNrm.push(nx, ny, nz);
        landTone.push(tone);
    };

    for (const t of tris) {
        const [p0, p1, p2] = t.pts;
        if (t.land) {
            pushLandTriangle(
                project(p0.x, p0.y, true),
                project(p1.x, p1.y, true),
                project(p2.x, p2.y, true),
                TerrainTone.Grass,
            );
        } else {
            const shore = Math.min(
                sampleDist(p0.x, p0.y),
                sampleDist(p1.x, p1.y),
                sampleDist(p2.x, p2.y),
            );
            waterIdx.push(
                waterVertex(p0.x, p0.y),
                waterVertex(p1.x, p1.y),
                waterVertex(p2.x, p2.y),
            );
            waterTone.push(
                shore <= SHALLOW_WATER_COAST_M ? TerrainTone.ShallowWater : TerrainTone.Water,
            );
        }
    }

    // Skirts: every triangle edge lying on the tile border belongs to exactly
    // one triangle, so each becomes one skirt quad hanging below the surface.
    const onBorder = (p: { x: number; y: number }) =>
        p.x === 0 || p.y === 0 || p.x === cells || p.y === cells;
    const sameBorder = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        (a.x === 0 && b.x === 0) || (a.x === cells && b.x === cells)
        || (a.y === 0 && b.y === 0) || (a.y === cells && b.y === cells);

    const skirt = input.skirtDepthM;
    for (const t of tris) {
        for (let e = 0; e < 3; e++) {
            const a = t.pts[e];
            const b = t.pts[(e + 1) % 3];
            if (!onBorder(a) || !onBorder(b) || !sameBorder(a, b)) {
                continue;
            }
            if (t.land) {
                const pa = project(a.x, a.y, true);
                const pb = project(b.x, b.y, true);
                const topA: Enu = { e: pa.e, n: pa.n, u: pa.u - SKIRT_TOP_EPS_M };
                const topB: Enu = { e: pb.e, n: pb.n, u: pb.u - SKIRT_TOP_EPS_M };
                const botA: Enu = { e: pa.e, n: pa.n, u: pa.u - skirt };
                const botB: Enu = { e: pb.e, n: pb.n, u: pb.u - skirt };
                pushLandTriangle(topA, topB, botB, TerrainTone.Grass);
                pushLandTriangle(topA, botB, botA, TerrainTone.Grass);
            } else {
                const ia = waterVertex(a.x, a.y);
                const ib = waterVertex(b.x, b.y);
                const key = (gx: number, gy: number) => `skirt:${gx.toFixed(4)},${gy.toFixed(4)}`;
                const bottom = (gx: number, gy: number, src: number): number => {
                    const k = key(gx, gy);
                    let idx = waterKey.get(k);
                    if (idx !== undefined) {
                        return idx;
                    }
                    idx = waterPos.length / 3;
                    waterPos.push(
                        waterPos[src * 3],
                        waterPos[src * 3 + 1] - skirt,
                        waterPos[src * 3 + 2],
                    );
                    waterKey.set(k, idx);
                    return idx;
                };
                const ja = bottom(a.x, a.y, ia);
                const jb = bottom(b.x, b.y, ib);
                const shore = Math.min(sampleDist(a.x, a.y), sampleDist(b.x, b.y));
                const tone = shore <= SHALLOW_WATER_COAST_M
                    ? TerrainTone.ShallowWater
                    : TerrainTone.Water;
                waterIdx.push(ia, ib, jb);
                waterTone.push(tone);
                waterIdx.push(ia, jb, ja);
                waterTone.push(tone);
            }
        }
    }

    // --- 7. encode ---------------------------------------------------------
    const tileHalfWidthM = Math.max(
        1,
        (lonSpan * 111320 * Math.cos(centreLat * Math.PI / 180)) / 2,
        (latSpan * 110540) / 2,
    );

    const bytes = encodePtm({
        id: input.id,
        centerHeightM,
        tileHalfWidthM,
        skirtDepthM: skirt,
        land: {
            positions: new Float32Array(landPos),
            faceNormals: new Float32Array(landNrm),
            tones: new Uint8Array(landTone),
        },
        water: {
            positions: new Float32Array(waterPos),
            indices: new Uint32Array(waterIdx),
            tones: new Uint8Array(waterTone),
        },
    });

    return {
        bytes,
        triangleCount: landTone.length + waterTone.length,
        landTriangles: landTone.length,
        waterTriangles: waterTone.length,
        maxErrorM,
        minLeafSize,
        attempts,
        centerHeightM,
    };
}
