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

interface CatalogAircraft {
    canonicalName: string;
    displayName: string;
    category?: string;
    description?: string;
    modelPath?: string;
}

interface ModCatalog {
    modName?: string;
    modId?: string;
    aircraft: CatalogAircraft[];
}

interface PlaneImportPlan {
    modId: string;
    idSlug: string;
    name: string;
    displayName: string;
    material: string | null;
    category?: string;
    description?: string;
    sourceMaterial?: string;
    confidence?: number;
}

interface ImportedAircraft {
    id: string;
    name: string;
    packUrl: string;
}

interface AircraftManifestListMeta {
    name?: string;
    displayName?: string;
    canonicalName?: string;
    sourceMod?: string;
    sourceModId?: string;
    sourceMaterial?: string;
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

function parseJsonLoose(text: string): unknown {
    const withoutBom = text.replace(/^\uFEFF/, '');
    const withoutTrailingCommas = withoutBom
        .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(withoutTrailingCommas);
}

function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .replace(/\.[0-9]+$/g, '')
        .replace(/\b(material|mat|palette|pallete)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokenizeName(value: string): Set<string> {
    return new Set(normalizeName(value).split(/\s+/g).filter(Boolean));
}

function materialLooksLikeNoise(material: string): boolean {
    const n = normalizeName(material);
    return [
        'light',
        'screen',
        'shared cockpit',
        'cockpit',
        'formation',
        'gbu',
        'shadow',
    ].some(noise => n.includes(noise));
}

function readZipText(files: Record<string, Uint8Array>, entry: string): string | null {
    const data = files[entry];
    if (!data) return null;
    return Buffer.from(data).toString('utf-8');
}

function zipEntryByName(files: Record<string, Uint8Array>, matcher: (normalized: string) => boolean): string | null {
    for (const entry of Object.keys(files)) {
        const normalized = entry.replace(/\\/g, '/').toLowerCase();
        if (matcher(normalized)) {
            return entry;
        }
    }
    return null;
}

function extractModCatalog(zipBuffer: Buffer): ModCatalog | null {
    try {
        const files = unzipSync(new Uint8Array(zipBuffer));
        const modEntry = zipEntryByName(files, name => name.endsWith('/mod.json') || name === 'mod.json');
        const flyablesEntry = zipEntryByName(files, name => name.endsWith('/data/flyables.json'));
        if (!flyablesEntry) return null;

        const dbEntry = zipEntryByName(files, name => name.endsWith('/data/database/aircraft.json'));
        const aircraft2Entries = Object.keys(files)
            .filter(name => name.replace(/\\/g, '/').toLowerCase().includes('/data/aircraft2/') && name.toLowerCase().endsWith('.json'));

        const modJsonText = modEntry ? readZipText(files, modEntry) : null;
        const flyablesText = readZipText(files, flyablesEntry);
        if (!flyablesText) return null;
        const dbText = dbEntry ? readZipText(files, dbEntry) : null;

        const modJson = modJsonText ? parseJsonLoose(modJsonText) as Record<string, unknown> : {};
        const flyables = parseJsonLoose(flyablesText) as Array<Record<string, unknown>>;
        const database = dbText ? parseJsonLoose(dbText) as Array<Record<string, unknown>> : [];

        const dbByName = new Map<string, Record<string, unknown>>();
        for (const row of database) {
            const name = typeof row.Name === 'string' ? row.Name : '';
            if (name) dbByName.set(normalizeName(name), row);
        }

        const aircraft2ByName = new Map<string, Record<string, unknown>>();
        for (const entry of aircraft2Entries) {
            const txt = readZipText(files, entry);
            if (!txt) continue;
            try {
                const row = parseJsonLoose(txt) as Record<string, unknown>;
                const name = typeof row.Name === 'string' ? row.Name : '';
                if (name) aircraft2ByName.set(normalizeName(name), row);
            } catch {
                // Skip malformed sidecar files; keep catalog extraction resilient.
            }
        }

        const aircraft: CatalogAircraft[] = [];
        for (const flyable of flyables) {
            const canonicalName = typeof flyable.Name === 'string' ? flyable.Name : '';
            if (!canonicalName) continue;
            const key = normalizeName(canonicalName);
            const db = dbByName.get(key);
            const a2 = aircraft2ByName.get(key);
            const displayName = (typeof a2?.DisplayName === 'string' && a2.DisplayName)
                || (typeof db?.DisplayName === 'string' && db.DisplayName)
                || canonicalName;
            const category = (typeof db?.Filter === 'string' && db.Filter)
                || (typeof a2?.TargetType === 'string' ? a2.TargetType : undefined);
            const description = (typeof db?.Description === 'string' ? db.Description : undefined);
            const modelPath = (typeof a2?.ModelPath === 'string' ? a2.ModelPath : undefined);
            aircraft.push({ canonicalName, displayName, category, description, modelPath });
        }

        if (!aircraft.length) return null;
        return {
            modName: typeof modJson?.DisplayName === 'string' ? modJson.DisplayName : undefined,
            modId: typeof modJson?.Id === 'string' ? modJson.Id : undefined,
            aircraft,
        };
    } catch {
        return null;
    }
}

function scoreCatalogMatch(plane: DiscoveredPlane, aircraft: CatalogAircraft): number {
    const planeNorm = normalizeName(`${plane.name} ${plane.material}`);
    const aircraftNorm = normalizeName(`${aircraft.canonicalName} ${aircraft.displayName}`);
    const aircraftFull = normalizeName(
        `${aircraft.canonicalName} ${aircraft.displayName} ${aircraft.description ?? ''} ${aircraft.modelPath ?? ''}`,
    );
    if (!planeNorm || !aircraftNorm) return 0;
    let score = 0;
    if (planeNorm === aircraftNorm) score += 10;
    if (planeNorm.includes(aircraftNorm) || aircraftNorm.includes(planeNorm)) score += 5;

    const planeTokens = tokenizeName(`${plane.name} ${plane.material}`);
    const aircraftTokens = tokenizeName(`${aircraft.canonicalName} ${aircraft.displayName}`);
    let overlap = 0;
    for (const token of planeTokens) {
        if (aircraftTokens.has(token)) {
            overlap++;
            continue;
        }
        for (const at of aircraftTokens) {
            if (token.length >= 3 && at.length >= 3 && (token.startsWith(at) || at.startsWith(token))) {
                overlap++;
                break;
            }
        }
    }
    score += overlap * 2;

    if (aircraft.modelPath) {
        const modelBase = path.basename(aircraft.modelPath, path.extname(aircraft.modelPath));
        const modelNorm = normalizeName(modelBase);
        if (modelNorm && (planeNorm.includes(modelNorm) || modelNorm.includes(planeNorm))) {
            score += 4;
        }
    }

    const keywordBoost: Array<[string, string]> = [
        ['rnlaf', 'rnlaf'],
        ['rdaf', 'rdaf'],
        ['vvs', 'vvs'],
        ['gdr', 'gdr'],
        ['czaf', 'czaf'],
        ['sabers', '52'],
        ['sabers', '15'],
    ];
    for (const [planeKey, aircraftKey] of keywordBoost) {
        if (planeNorm.includes(planeKey) && aircraftFull.includes(aircraftKey)) {
            score += 4;
        }
    }
    return score;
}

function buildPlanesFromCatalog(
    discovered: DiscoveredPlane[],
    catalog: ModCatalog | null,
    baseSlug: string,
): PlaneImportPlan[] {
    const filtered = discovered.filter(p => !materialLooksLikeNoise(p.material));
    if (!catalog) {
        return filtered.map((plane) => {
            const idSlug = slugify(plane.material);
            return {
                modId: uniqueModId(`${baseSlug}_${idSlug}`),
                idSlug,
                name: plane.name,
                displayName: plane.name,
                material: plane.material,
                sourceMaterial: plane.material,
                confidence: 0.5,
            };
        });
    }

    const bestByAircraft = new Map<string, { plane: DiscoveredPlane; score: number; aircraft: CatalogAircraft }>();
    for (const plane of filtered) {
        let best: { score: number; aircraft: CatalogAircraft } | null = null;
        for (const aircraft of catalog.aircraft) {
            const score = scoreCatalogMatch(plane, aircraft);
            if (!best || score > best.score) {
                best = { score, aircraft };
            }
        }
        if (!best || best.score < 2) continue;
        const key = normalizeName(best.aircraft.canonicalName);
        const prev = bestByAircraft.get(key);
        if (!prev || best.score > prev.score) {
            bestByAircraft.set(key, { plane, score: best.score, aircraft: best.aircraft });
        }
    }

    const plans: PlaneImportPlan[] = [];
    for (const { plane, score, aircraft } of bestByAircraft.values()) {
        const idSlug = slugify(aircraft.canonicalName);
        plans.push({
            modId: uniqueModId(`${baseSlug}_${idSlug}`),
            idSlug,
            name: aircraft.canonicalName,
            displayName: aircraft.displayName,
            material: plane.material,
            category: aircraft.category,
            description: aircraft.description,
            sourceMaterial: plane.material,
            confidence: Number((Math.min(1, score / 12)).toFixed(3)),
        });
    }
    return plans;
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
    plane: PlaneImportPlan,
    embedded: Partial<ImportConfig> | null,
    catalog: ModCatalog | null,
): ImportConfig {
    const multiPlane = plane.material !== null;
    const base: ImportConfig = embedded
        ? { ...embedded, bundle: bundlePath }
        : {
            bundle: bundlePath,
            groundDistance: 2.0,
            scale: 1.0,
            swatchMax: 64,
            glassColor: 'GLASS',
            glassAutoAlpha: true,
            skipMaterials: ['Collider', 'ShadowDepthOffset', 'Shadow'],
        };

    return {
        ...base,
        id: plane.modId,
        name: plane.displayName || plane.name,
        displayName: plane.displayName,
        canonicalName: plane.name,
        category: plane.category,
        description: plane.description,
        sourceMaterial: plane.sourceMaterial,
        sourceMod: catalog?.modName ?? prettyName(path.basename(bundlePath)),
        sourceModId: catalog?.modId,
        importMeta: {
            confidence: plane.confidence ?? 0,
            discoveredFrom: plane.sourceMaterial ?? null,
        },
        bundle: bundlePath,
        out: `${IMPORTS_PREFIX}/${plane.modId}_static.gltf`,
        flyable: { ...(base.flyable ?? {}), outPrefix: `${IMPORTS_PREFIX}/${plane.modId}` },
        ...(multiPlane ? {
            includeMaterials: [plane.material!],
            dedupeParts: true,
            rescueGlassUnderRoot: true,
            rescueMaterialsUnderRoot: true,
        } : {}),
    };
}

function listAircraftPacks(): ImportedAircraft[] {
    const distAssets = path.join(DIST_DIR, 'assets');
    if (!fs.existsSync(distAssets)) {
        return [];
    }
    const deduped = new Map<string, { entry: ImportedAircraft; mtimeMs: number }>();
    for (const file of fs.readdirSync(distAssets)) {
        if (!file.endsWith('.aircraft.pack')) {
            continue;
        }
        const id = file.slice(0, -'.aircraft.pack'.length);
        const packPath = path.join(distAssets, file);
        const stat = fs.statSync(packPath);
        let name = id;
        let dedupeKey = id;
        const manifestPath = manifestPathForId(id);
        if (manifestPath) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as AircraftManifestListMeta;
            name = manifest.displayName ?? manifest.name ?? id;
            // Re-imports produce suffixed ids (_2, _3, ...). Collapse identical
            // aircraft/material variants and keep only the newest pack in the menu.
            if (manifest.canonicalName || manifest.sourceModId || manifest.sourceMod || manifest.sourceMaterial) {
                dedupeKey = [
                    manifest.sourceModId ?? manifest.sourceMod ?? '',
                    manifest.canonicalName ?? name,
                    manifest.sourceMaterial ?? '',
                ].join('::');
            }
        }
        const entry = { id, name, packUrl: `assets/${file}` };
        const prev = deduped.get(dedupeKey);
        if (!prev || stat.mtimeMs > prev.mtimeMs) {
            deduped.set(dedupeKey, { entry, mtimeMs: stat.mtimeMs });
        }
    }
    return [...deduped.values()].map(v => v.entry).sort((a, b) => a.name.localeCompare(b.name));
}

async function importPlaneConfig(configPath: string, log: string[]): Promise<void> {
    const imp = await runPython(['tools/import_mod.py', '--config', configPath]);
    log.push(`$ python tools/import_mod.py --config ${path.basename(configPath)}\n${imp.stdout}${imp.stderr}`);
    if (imp.code !== 0) {
        throw new Error('import_mod.py failed');
    }
}

const LIVE_RELOAD = process.env.LIVE_RELOAD === '1';

const LIVE_RELOAD_SCRIPT = `<script>
(() => {
  const es = new EventSource('/__live_reload');
  es.onmessage = () => window.location.reload();
})();
</script>`;

let liveReloadClients: Response[] = [];

function notifyLiveReload(): void {
    for (const client of liveReloadClients) {
        client.write('data: reload\n\n');
    }
}

function watchBundleForReload(): void {
    const bundlePath = path.join(DIST_DIR, 'bundle.js');
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const startWatching = () => {
        fs.watch(bundlePath, () => {
            clearTimeout(debounce);
            debounce = setTimeout(notifyLiveReload, 150);
        });
        console.log('Live reload enabled — browser refreshes when bundle.js rebuilds');
    };

    if (fs.existsSync(bundlePath)) {
        startWatching();
        return;
    }

    const dirWatcher = fs.watch(DIST_DIR, () => {
        if (!fs.existsSync(bundlePath)) {
            return;
        }
        dirWatcher.close();
        startWatching();
    });
}

const app = express();

if (LIVE_RELOAD) {
    app.get('/__live_reload', (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        liveReloadClients.push(res);
        req.on('close', () => {
            liveReloadClients = liveReloadClients.filter((client) => client !== res);
        });
    });

    app.use((req: Request, res: Response, next) => {
        if (req.method !== 'GET' || (req.path !== '/' && req.path !== '/index.html')) {
            next();
            return;
        }

        const indexPath = path.join(DIST_DIR, 'index.html');
        if (!fs.existsSync(indexPath)) {
            next();
            return;
        }

        const html = fs.readFileSync(indexPath, 'utf8');
        if (!html.includes('</body>')) {
            res.type('html').send(html);
            return;
        }

        res.type('html').send(html.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`));
    });
}

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
    const catalog = extractModCatalog(req.file.buffer);
    const log: string[] = [];
    const imported: ImportedAircraft[] = [];

    try {
        let planes: PlaneImportPlan[];

        if (embedded?.includeMaterials?.length) {
            const idSlug = slugify(embedded.name ?? baseSlug);
            planes = [{
                modId: uniqueModId(baseSlug),
                idSlug,
                name: embedded.name ?? prettyName(originalName),
                displayName: embedded.name ?? prettyName(originalName),
                material: null,
                confidence: 1,
            }];
        } else {
            const discovered = await discoverPlanes(zipPath);
            log.push(`$ python tools/import_mod.py --bundle ... --discover\n${JSON.stringify(discovered, null, 2)}\n`);
            if (catalog) {
                log.push(`[catalog] ${catalog.aircraft.length} aircraft entries from mod metadata`);
            }
            planes = buildPlanesFromCatalog(discovered, catalog, baseSlug);
            if (planes.length === 0) {
                // Fallback: still allow import if matching fails.
                planes = [{
                    modId: uniqueModId(baseSlug),
                    idSlug: baseSlug,
                    name: prettyName(originalName),
                    displayName: prettyName(originalName),
                    material: null,
                    confidence: 0,
                }];
            }
        }

        const importJobs = planes.map((plane) => {
            const config = buildPlaneConfig(zipPath, plane, embedded, catalog);
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
                name: manifest.name || plane.displayName || plane.name,
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

app.use(express.static(DIST_DIR, {
    index: LIVE_RELOAD ? false : 'index.html',
    setHeaders(res, filePath) {
        if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    },
}));

app.listen(PORT, () => {
    console.log(`retroflightsim dev server running at http://localhost:${PORT}`);
    console.log(`Serving ${DIST_DIR}`);
    console.log('Mod import endpoint: POST /api/import-mod (F10 in-app upload)');
    if (LIVE_RELOAD) {
        watchBundleForReload();
    }
});
