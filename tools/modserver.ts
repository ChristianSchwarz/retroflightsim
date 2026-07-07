// Local dev server for retroflightsim.
//
// Serves the built `dist/` folder statically and adds the F10 upload endpoint:
//   POST /api/import-mod   (multipart form-data, field "mod" = a Unity mod .zip)
//
// Multi-plane mod packs are split by Unity livery material: each aircraft becomes
// its own .aircraft.pack so liveries stay separate in the spawn menu.

import express, { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { unzipSync } from 'fflate';

const PROJECT_ROOT = path.dirname(__dirname);
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const IMPORTS_DIR = path.join(PROJECT_ROOT, 'tools', 'mods', 'imports');
const IMPORTS_PREFIX = 'tools/mods/imports';
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'tools', 'mods', 'uploads');
const PYTHON = process.env.PYTHON || 'python';
const PORT = Number(process.env.PORT) || 8010;

interface ImportConfig {
    name?: string;
    bundle: string;
    out: string;
    includeMaterials?: string[];
    dedupeParts?: boolean;
    rescueGlassUnderRoot?: boolean;
    grayscale?: boolean | { lo: number; hi: number };
    flyable?: Record<string, unknown>;
    [key: string]: unknown;
}

interface DiscoveredPlane {
    material: string;
    name: string;
    partCount?: number;
    bodyParts?: number;
}

interface ImportedAircraft {
    id: string;
    name: string;
    packUrl: string;
}

const upload = multer({ storage: multer.memoryStorage() });

function slugify(name: string): string {
    const base = path.basename(name, path.extname(name));
    const slug = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || 'mod';
}

function prettyName(name: string): string {
    const base = path.basename(name, path.extname(name));
    const cleaned = base.replace(/[_\-]+/g, ' ').trim();
    return cleaned || 'Imported Aircraft';
}

function uniqueModId(slug: string): string {
    let id = slug;
    let n = 2;
    while (
        fs.existsSync(path.join(IMPORTS_DIR, `${id}.aircraft.json`))
        || fs.existsSync(path.join(ASSETS_DIR, `${id}.aircraft.json`))
    ) {
        id = `${slug}_${n++}`;
    }
    return id;
}

function manifestPathForId(id: string): string | null {
    const imported = path.join(IMPORTS_DIR, `${id}.aircraft.json`);
    if (fs.existsSync(imported)) {
        return imported;
    }
    const shipped = path.join(ASSETS_DIR, `${id}.aircraft.json`);
    if (fs.existsSync(shipped)) {
        return shipped;
    }
    return null;
}

function findEmbeddedConfig(zipBuffer: Buffer): Partial<ImportConfig> | null {
    try {
        const files = unzipSync(new Uint8Array(zipBuffer));
        for (const entry of Object.keys(files)) {
            if (path.basename(entry).toLowerCase() === 'retroflight.json') {
                const text = Buffer.from(files[entry]).toString('utf-8');
                return JSON.parse(text) as Partial<ImportConfig>;
            }
        }
    } catch (err) {
        console.warn('[modserver] could not scan zip for embedded config:', (err as Error).message);
    }
    return null;
}

interface PythonResult {
    code: number | null;
    stdout: string;
    stderr: string;
}

function runPython(args: string[]): Promise<PythonResult> {
    return new Promise((resolve) => {
        const child = spawn(PYTHON, args, { cwd: PROJECT_ROOT });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
        child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        child.on('error', (err: Error) => resolve({ code: -1, stdout, stderr: stderr + `\n${err.message}` }));
        child.on('close', (code: number | null) => resolve({ code, stdout, stderr }));
    });
}

async function discoverPlanes(bundlePath: string): Promise<DiscoveredPlane[]> {
    const result = await runPython(['tools/import_mod.py', '--bundle', bundlePath, '--discover']);
    if (result.code !== 0) {
        throw new Error(`discover failed: ${result.stderr || result.stdout}`);
    }
    const text = result.stdout.trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start < 0 || end <= start) {
        throw new Error(`discover returned invalid JSON: ${text}`);
    }
    try {
        return JSON.parse(text.slice(start, end + 1)) as DiscoveredPlane[];
    } catch {
        throw new Error(`discover returned invalid JSON: ${text}`);
    }
}

function buildPlaneConfig(
    bundlePath: string,
    modId: string,
    planeName: string,
    material: string | null,
    embedded: Partial<ImportConfig> | null,
): ImportConfig {
    const multiPlane = material !== null;
    const base: ImportConfig = embedded
        ? { ...embedded, bundle: bundlePath }
        : {
            bundle: bundlePath,
            groundDistance: 2.0,
            scale: 1.0,
            swatchMax: 64,
            glassAutoAlpha: true,
            skipMaterials: ['Collider', 'ShadowDepthOffset', 'Shadow'],
        };

    return {
        ...base,
        name: planeName,
        bundle: bundlePath,
        out: `${IMPORTS_PREFIX}/${modId}_static.gltf`,
        flyable: { ...(base.flyable ?? {}), outPrefix: `${IMPORTS_PREFIX}/${modId}` },
        ...(multiPlane ? {
            includeMaterials: [material!],
            dedupeParts: true,
            rescueGlassUnderRoot: true,
        } : {}),
    };
}

function listAircraftPacks(): ImportedAircraft[] {
    const distAssets = path.join(DIST_DIR, 'assets');
    if (!fs.existsSync(distAssets)) {
        return [];
    }
    const packs: ImportedAircraft[] = [];
    for (const file of fs.readdirSync(distAssets)) {
        if (!file.endsWith('.aircraft.pack')) {
            continue;
        }
        const id = file.slice(0, -'.aircraft.pack'.length);
        let name = id;
        const manifestPath = manifestPathForId(id);
        if (manifestPath) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { name?: string };
            name = manifest.name ?? id;
        }
        packs.push({ id, name, packUrl: `assets/${file}` });
    }
    return packs.sort((a, b) => a.name.localeCompare(b.name));
}

async function importPlaneConfig(configPath: string, log: string[]): Promise<void> {
    const imp = await runPython(['tools/import_mod.py', '--config', configPath]);
    log.push(`$ python tools/import_mod.py --config ${path.basename(configPath)}\n${imp.stdout}${imp.stderr}`);
    if (imp.code !== 0) {
        throw new Error('import_mod.py failed');
    }
}

const app = express();

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, server: 'modserver' });
});

app.get('/api/aircraft-packs', (_req: Request, res: Response) => {
    res.json(listAircraftPacks());
});

app.post('/api/import-mod', upload.single('mod'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ ok: false, error: 'No file uploaded (expected field "mod").' });
    }

    const originalName = req.file.originalname || 'mod.zip';
    const baseSlug = slugify(originalName);

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.mkdirSync(IMPORTS_DIR, { recursive: true });
    const stamp = Date.now();
    const zipPath = path.join(UPLOADS_DIR, `${baseSlug}-${stamp}.zip`);
    fs.writeFileSync(zipPath, req.file.buffer);

    const embedded = findEmbeddedConfig(req.file.buffer);
    const log: string[] = [];
    const imported: ImportedAircraft[] = [];

    try {
        let planes: { modId: string; name: string; material: string | null }[];

        if (embedded?.includeMaterials?.length) {
            const modId = uniqueModId(baseSlug);
            planes = [{ modId, name: embedded.name ?? prettyName(originalName), material: null }];
        } else {
            const discovered = await discoverPlanes(zipPath);
            log.push(`$ python tools/import_mod.py --bundle ... --discover\n${JSON.stringify(discovered, null, 2)}\n`);

            if (discovered.length === 0) {
                planes = [{ modId: uniqueModId(baseSlug), name: prettyName(originalName), material: null }];
            } else {
                planes = discovered.map((plane) => {
                    const matSlug = slugify(plane.material);
                    const modId = uniqueModId(`${baseSlug}_${matSlug}`);
                    return { modId, name: plane.name, material: plane.material };
                });
            }
        }

        const importJobs = planes.map((plane) => {
            const config = buildPlaneConfig(zipPath, plane.modId, plane.name, plane.material, embedded);
            const configPath = path.join(UPLOADS_DIR, `${plane.modId}-${stamp}.config.json`);
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return importPlaneConfig(configPath, log);
        });
        await Promise.all(importJobs);

        const pack = await runPython(['tools/pack_aircraft_mods.py', '--imports-only']);
        log.push(`\n$ python tools/pack_aircraft_mods.py\n${pack.stdout}${pack.stderr}`);
        if (pack.code !== 0) {
            return res.status(500).json({ ok: false, error: 'pack_aircraft_mods.py failed', log: log.join('\n') });
        }

        for (const plane of planes) {
            const manifestPath = path.join(IMPORTS_DIR, `${plane.modId}.aircraft.json`);
            const packPath = path.join(DIST_DIR, 'assets', `${plane.modId}.aircraft.pack`);
            if (!fs.existsSync(manifestPath) || !fs.existsSync(packPath)) {
                continue;
            }
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { name?: string };
            imported.push({
                id: plane.modId,
                name: manifest.name || plane.name,
                packUrl: `assets/${plane.modId}.aircraft.pack`,
            });
        }

        if (imported.length === 0) {
            return res.status(500).json({
                ok: false,
                error: 'Import produced no flyable aircraft (the mod may not be a supported plane bundle).',
                log: log.join('\n'),
            });
        }

        return res.json({ ok: true, imported, log: log.join('\n') });
    } catch (err) {
        return res.status(500).json({ ok: false, error: (err as Error).message, log: log.join('\n') });
    }
});

app.use(express.static(DIST_DIR));

app.listen(PORT, () => {
    console.log(`retroflightsim dev server running at http://localhost:${PORT}`);
    console.log(`Serving ${DIST_DIR}`);
    console.log('Mod import endpoint: POST /api/import-mod (F10 in-app upload)');
});
