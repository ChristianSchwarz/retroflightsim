import { spawnSync } from 'child_process';

const script = process.argv[2];
const scriptArgs = process.argv.slice(3);

function run(exe, prefixArgs) {
    const result = spawnSync(exe, [...prefixArgs, script, ...scriptArgs], {
        stdio: 'inherit',
    });
    if (result.error?.code === 'ENOENT') {
        return false;
    }
    process.exit(result.status ?? 1);
}

if (process.env.PYTHON) {
    run(process.env.PYTHON, []);
}

const candidates = process.platform === 'win32'
    ? [['py', ['-3']], ['python', []]]
    : [['python3', []], ['python', []]];

for (const [exe, prefixArgs] of candidates) {
    run(exe, prefixArgs);
}

console.error('Python not found. Install Python 3 or set the PYTHON environment variable.');
process.exit(1);
