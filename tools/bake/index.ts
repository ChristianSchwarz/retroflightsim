/**
 * PIX1 "tile exists" bitmask writer.
 *
 * Same bytes the existing tools/bake_planet_dem.py emits and
 * src/script/planet/tileIndex.ts reads, so the runtime gate is unchanged. The
 * mesh bake writes its own copy as a record of exactly which .ptm files it
 * produced: "not in the index" then unambiguously means "ocean, generate a
 * patch", and a partial bake is detectable instead of showing up as holes.
 */

export const INDEX_MAGIC = 0x31584950; // 'PIX1' little-endian

export interface TileKey {
    z: number;
    x: number;
    y: number;
}

export function encodeTileIndex(
    present: Iterable<TileKey>,
    minZoom: number,
    maxZoom: number,
): Uint8Array {
    const byLevel = new Map<number, TileKey[]>();
    for (let z = minZoom; z <= maxZoom; z++) {
        byLevel.set(z, []);
    }
    for (const k of present) {
        const list = byLevel.get(k.z);
        if (list) {
            list.push(k);
        }
    }

    interface Level {
        minX: number;
        minY: number;
        w: number;
        h: number;
        bits: Uint8Array;
    }
    const levels: Level[] = [];
    for (let z = minZoom; z <= maxZoom; z++) {
        const keys = byLevel.get(z)!;
        if (keys.length === 0) {
            levels.push({ minX: 0, minY: 0, w: 0, h: 0, bits: new Uint8Array(0) });
            continue;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const k of keys) {
            if (k.x < minX) minX = k.x;
            if (k.y < minY) minY = k.y;
            if (k.x > maxX) maxX = k.x;
            if (k.y > maxY) maxY = k.y;
        }
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const bits = new Uint8Array(Math.ceil((w * h) / 8));
        for (const k of keys) {
            const i = (k.y - minY) * w + (k.x - minX);
            bits[i >> 3] |= 1 << (i & 7);
        }
        levels.push({ minX, minY, w, h, bits });
    }

    let total = 8 + levels.length * 16;
    for (const l of levels) {
        total += l.bits.byteLength;
    }
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, INDEX_MAGIC, true);
    view.setUint16(4, minZoom, true);
    view.setUint16(6, maxZoom, true);
    let o = 8;
    for (const l of levels) {
        view.setUint32(o, l.minX, true);
        view.setUint32(o + 4, l.minY, true);
        view.setUint32(o + 8, l.w, true);
        view.setUint32(o + 12, l.h, true);
        o += 16;
    }
    for (const l of levels) {
        out.set(l.bits, o);
        o += l.bits.byteLength;
    }
    return out;
}
