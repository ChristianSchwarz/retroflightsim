// Copy authored missions into the bundle.
//
//   node tools/pack_missions.mjs        (or: npm run pack-missions)
//
// Missions are saved to `data/missions/` by the dev server, which is not part
// of the build. This is the deliberate step that publishes them: it copies every
// mission into `assets/missions/` and writes the `index.json` the client reads
// when there is no server to ask — a static `dist/` on GitHub Pages, say.
//
// Run it on purpose, not on save. `tools/dev.mjs` watches `assets/` and maps
// every change there to `npm run pack-mods`, so wiring this into the save path
// would spawn a Python subprocess each time you moved a waypoint.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(PROJECT_ROOT, 'data', 'missions');
const OUT = path.join(PROJECT_ROOT, 'assets', 'missions');
const SUFFIX = '.mission.json';

if (!fs.existsSync(SRC)) {
    console.log(`[pack-missions] nothing to do: ${path.relative(PROJECT_ROOT, SRC)} does not exist`);
    process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });

const summaries = [];
let skipped = 0;

for (const file of fs.readdirSync(SRC).sort()) {
    if (!file.endsWith(SUFFIX)) {
        continue;
    }
    const from = path.join(SRC, file);
    let doc;
    try {
        doc = JSON.parse(fs.readFileSync(from, 'utf8'));
    } catch (err) {
        // Say what was dropped rather than silently publishing a shorter list:
        // a mission missing from the bundle with no explanation reads as the
        // packer having worked.
        console.warn(`[pack-missions] skipping ${file}: ${err.message}`);
        skipped++;
        continue;
    }
    if (typeof doc?.id !== 'string' || `${doc.id}${SUFFIX}` !== file) {
        console.warn(`[pack-missions] skipping ${file}: id "${doc?.id}" does not match the filename`);
        skipped++;
        continue;
    }
    fs.copyFileSync(from, path.join(OUT, file));
    summaries.push({
        id: doc.id,
        name: doc.name ?? doc.id,
        area: doc.area ?? '',
        savedUtc: doc.savedUtc,
    });
}

// The same shape GET /api/missions returns, so the client's two paths — server
// and static — differ only in where they fetch from.
fs.writeFileSync(
    path.join(OUT, 'index.json'),
    `${JSON.stringify(summaries, null, 2)}\n`,
    'utf8');

console.log(
    `[pack-missions] packed ${summaries.length} mission(s) into `
    + `${path.relative(PROJECT_ROOT, OUT)}${skipped > 0 ? `, skipped ${skipped}` : ''}`);
