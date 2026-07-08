import { scheduleBuild } from '../../tools/autoBuild.mjs';

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8').trim();
}

const inputText = await readStdin();
if (!inputText) {
    process.exit(0);
}

try {
    const input = JSON.parse(inputText);
    if (input.file_path) {
        scheduleBuild(input.file_path);
    }
} catch (error) {
    console.error('[auto-build] invalid hook input:', error.message);
    process.exit(1);
}
