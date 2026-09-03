// Mission storage: the server half of the mission editor.
//
//   GET    /api/missions       every saved mission, as a summary list
//   GET    /api/missions/:id   one mission document
//   PUT    /api/missions/:id   save (create or overwrite) one mission
//   DELETE /api/missions/:id   remove one mission
//
// Missions live in `data/missions/<id>.mission.json`, one file per mission,
// with the id as the filename stem so the store needs no index of its own.
//
// `data/` rather than `assets/`: tools/dev.mjs watches `assets/` and maps every
// change there to `npm run pack-mods`, so saving a mission under it would spawn
// a Python subprocess on each keystroke-debounce. `npm run pack-missions` is
// the deliberate step that copies missions into the bundle.
//
// This is dev-server only. The published game is a static `dist/` on GitHub
// Pages with no `/api/*` at all, which is why the client probes `/api/health`
// and falls back to a bundled read plus a file download. See README.md, where
// the same caveat is already documented for the F10 mod import.

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { missionSlug, validateMission } from '../src/script/mission/missionValidate';

const PROJECT_ROOT = path.dirname(__dirname);
const MISSIONS_DIR = path.join(PROJECT_ROOT, 'data', 'missions');
const SUFFIX = '.mission.json';

export interface MissionSummary {
    id: string;
    name: string;
    area: string;
    savedUtc?: string;
}

/**
 * The absolute path a mission id maps to, or undefined when the id is not one
 * this server will write.
 *
 * Three checks, none of which is redundant:
 *
 *  - the slug strips anything that could climb out of the directory;
 *  - the empty result is rejected, because `missionSlug('...')` is `''` and a
 *    path built from it is a *hidden* `.mission.json` with no name — which
 *    passes a naive containment check and is invisible in a listing;
 *  - containment is asserted on the resolved path anyway, because a sanitiser
 *    is a claim and `path.resolve` is a fact.
 *
 * Deliberately not modelled on `loadPreview` in modserver.ts, which joins an
 * unsanitised client token into a path.
 */
export function missionPath(id: unknown): string | undefined {
    if (typeof id !== 'string') {
        return undefined;
    }
    const slug = missionSlug(id);
    if (slug.length === 0 || slug !== id) {
        return undefined;
    }
    const p = path.resolve(MISSIONS_DIR, `${slug}${SUFFIX}`);
    if (!p.startsWith(MISSIONS_DIR + path.sep)) {
        return undefined;
    }
    return p;
}

/** Read and summarise every mission on disk, skipping anything unreadable. */
export function readSummaries(): MissionSummary[] {
    if (!fs.existsSync(MISSIONS_DIR)) {
        return [];
    }
    const out: MissionSummary[] = [];
    for (const file of fs.readdirSync(MISSIONS_DIR)) {
        if (!file.endsWith(SUFFIX)) {
            continue;
        }
        try {
            const raw = JSON.parse(fs.readFileSync(path.join(MISSIONS_DIR, file), 'utf8'));
            const v = validateMission(raw);
            if (!v.ok || v.doc === undefined) {
                // A file that is on disk but not loadable is worth showing as
                // broken rather than hiding, but the summary shape has nowhere
                // to say so, so it is left out of the list and still readable
                // by id — where the errors come back in full.
                continue;
            }
            out.push({
                id: v.doc.id,
                name: v.doc.name,
                area: v.doc.area,
                savedUtc: v.doc.savedUtc,
            });
        } catch {
            continue;
        }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
}

// --- routes ----------------------------------------------------------------

/** Bare array, matching the /api/aircraft-packs shape. */
export function listMissions(_req: Request, res: Response): void {
    try {
        res.json(readSummaries());
    } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
    }
}

export function readMission(req: Request, res: Response): void {
    const p = missionPath(req.params.id);
    if (p === undefined) {
        res.status(400).json({ ok: false, error: 'bad mission name' });
        return;
    }
    try {
        if (!fs.existsSync(p)) {
            res.status(404).json({ ok: false, error: 'no such mission' });
            return;
        }
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const v = validateMission(raw);
        if (!v.ok) {
            // Hand back the issues rather than a bare 500: this is the case
            // where someone hand-edited a mission file, and the paths are what
            // let the editor point at the line they broke.
            res.status(400).json({ ok: false, errors: v.errors });
            return;
        }
        res.json(v.doc);
    } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
    }
}

/**
 * Save a mission. Last write wins: the server stamps `savedUtc` and the editor
 * compares it against what it loaded to warn before overwriting a newer save.
 * A real precondition protocol is not worth the round trip for a tool one
 * person runs on their own machine.
 */
export function saveMission(req: Request, res: Response): void {
    const p = missionPath(req.params.id);
    if (p === undefined) {
        res.status(400).json({ ok: false, error: 'bad mission name' });
        return;
    }
    const v = validateMission(req.body);
    if (!v.ok || v.doc === undefined) {
        res.status(400).json({ ok: false, errors: v.errors });
        return;
    }
    if (v.doc.id !== req.params.id) {
        // The id is the filename, so a mismatch would write a file that then
        // reads back as a different mission than the one just saved.
        res.status(400).json({
            ok: false,
            errors: [{ path: 'id', message: `does not match the url ("${req.params.id}")` }],
        });
        return;
    }
    try {
        const savedUtc = new Date().toISOString();
        const doc = { ...v.doc, savedUtc };
        fs.mkdirSync(MISSIONS_DIR, { recursive: true });
        fs.writeFileSync(p, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
        res.json({ ok: true, id: doc.id, savedUtc, warnings: v.warnings });
    } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
    }
}

export function deleteMission(req: Request, res: Response): void {
    const p = missionPath(req.params.id);
    if (p === undefined) {
        res.status(400).json({ ok: false, error: 'bad mission name' });
        return;
    }
    try {
        if (!fs.existsSync(p)) {
            res.status(404).json({ ok: false, error: 'no such mission' });
            return;
        }
        fs.unlinkSync(p);
        res.json({ ok: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
    }
}
