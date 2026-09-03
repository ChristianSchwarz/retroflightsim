import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import { validateMission } from '../src/script/mission/missionValidate';
import { missionPath } from './missions';

/**
 * The mission store's path handling, which is the part that takes untrusted
 * input. The route handlers themselves are thin wrappers over `fs` and are
 * exercised by hand against a running server; what is worth pinning here is
 * that no id a client can send escapes `data/missions/`.
 */

const MISSIONS_DIR = path.resolve(path.dirname(__dirname), 'data', 'missions');

describe('missionPath', () => {
    it('accepts an id that is already its own slug', () => {
        const p = missionPath('gclp-cap');
        assert.ok(p !== undefined);
        assert.equal(p, path.join(MISSIONS_DIR, 'gclp-cap.mission.json'));
    });

    it('refuses every shape of traversal', () => {
        for (const evil of [
            '../../etc/passwd',
            '..\\..\\windows\\system32',
            'a/b',
            'a\\b',
            '..',
            '.',
            '../secrets',
            '/etc/passwd',
            'C:\\Windows\\win',
        ]) {
            assert.equal(missionPath(evil), undefined, `"${evil}" was accepted`);
        }
    });

    it('refuses an id that slugs to nothing, which would write a hidden file', () => {
        // missionSlug('...') is '', and `${''}.mission.json` is a dotfile that
        // passes a naive containment check and never shows up in a listing.
        for (const bad of ['...', '', '   ', '---']) {
            assert.equal(missionPath(bad), undefined, `"${bad}" was accepted`);
        }
    });

    it('refuses an id that is not already sanitised, rather than sanitising it', () => {
        // Silently rewriting the id would save the mission under a name the
        // client did not ask for and cannot predict.
        for (const unsanitised of ['Gran Canaria', 'GCLP_CAP', 'cap!', 'CAP']) {
            assert.equal(missionPath(unsanitised), undefined, `"${unsanitised}" was accepted`);
        }
    });

    it('refuses anything that is not a string', () => {
        for (const junk of [undefined, null, 42, {}, []]) {
            assert.equal(missionPath(junk), undefined);
        }
    });

    it('always resolves inside the missions directory', () => {
        for (const id of ['a', 'gclp-cap', 'x'.repeat(40)]) {
            const p = missionPath(id);
            assert.ok(p !== undefined, `"${id}" was refused`);
            assert.ok(p!.startsWith(MISSIONS_DIR + path.sep), `${p} escaped`);
        }
    });
});

describe('the bundled example mission', () => {
    const example = path.resolve(
        path.dirname(__dirname), 'assets', 'missions', 'gclp-cap.mission.json');

    it('exists and validates', () => {
        // One copy, shared by the docs, the static fallback and this test — so
        // a broken example breaks the build rather than surprising someone
        // opening the editor for the first time.
        assert.ok(fs.existsSync(example), `${example} is missing`);
        const v = validateMission(JSON.parse(fs.readFileSync(example, 'utf8')));
        assert.equal(v.ok, true, v.errors.map(e => `${e.path}: ${e.message}`).join('; '));
    });

    it('has an id matching its filename stem', () => {
        const v = validateMission(JSON.parse(fs.readFileSync(example, 'utf8')));
        assert.equal(v.doc!.id, 'gclp-cap');
        assert.ok(missionPath(v.doc!.id) !== undefined);
    });
});
