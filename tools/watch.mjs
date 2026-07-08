import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scheduleBuild } from './autoBuild.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

function watchDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    fs.watch(dirPath, { recursive: true }, (_eventType, fileName) => {
        if (!fileName) {
            return;
        }
        scheduleBuild(path.join(dirPath, fileName));
    });
}

console.log('[watch] webpack rebuilds on src changes; pack-mods runs on asset changes');

const webpack = spawn('npx', ['webpack', '--mode=development', '--watch'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

webpack.on('close', (code) => {
    process.exit(code ?? 0);
});

watchDirectory(path.join(PROJECT_ROOT, 'assets'));
watchDirectory(path.join(PROJECT_ROOT, 'tools', 'mods', 'imports'));
