import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { KeyboardControlLayoutId } from '../input/keyboardLayouts';
import { AiPilotModels, FlightModels, TechProfiles, UnitSystems } from '../state/gameDefs';
import { DEFAULT_SETTINGS, loadSettings, updateSettings } from './settingsStorage';

const STORAGE_KEY = 'retroflightsim.settings';
const memory = new Map<string, string>();

(globalThis as unknown as { localStorage: Storage }).localStorage = {
    get length() { return memory.size; },
    clear() { memory.clear(); },
    getItem(key: string) { return memory.has(key) ? memory.get(key)! : null; },
    setItem(key: string, value: string) { memory.set(key, value); },
    removeItem(key: string) { memory.delete(key); },
    key() { return null; },
};

afterEach(() => {
    memory.clear();
});

describe('settingsStorage', () => {
    it('returns defaults when nothing is stored', () => {
        assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    });

    it('persists and restores all OSD settings across load', () => {
        updateSettings({
            techProfile: TechProfiles.CGA,
            flightModel: FlightModels.DEBUG,
            keyboardLayout: KeyboardControlLayoutId.QWERTY,
            unitSystem: UnitSystems.IMPERIAL,
            aiPilotModel: AiPilotModels.SHAW,
        });

        const raw = memory.get(STORAGE_KEY);
        assert.ok(raw);
        assert.deepEqual(JSON.parse(raw!), {
            techProfile: 'CGA',
            flightModel: 'DEBUG',
            keyboardLayout: 0,
            unitSystem: 'IMPERIAL',
            aiPilotModel: 'SHAW',
        });
        assert.deepEqual(loadSettings(), {
            techProfile: TechProfiles.CGA,
            flightModel: FlightModels.DEBUG,
            keyboardLayout: KeyboardControlLayoutId.QWERTY,
            unitSystem: UnitSystems.IMPERIAL,
            aiPilotModel: AiPilotModels.SHAW,
        });
    });

    it('merges partial updates without wiping other fields', () => {
        updateSettings({
            techProfile: TechProfiles.VGA,
            unitSystem: UnitSystems.IMPERIAL,
            aiPilotModel: AiPilotModels.SHAW,
        });
        updateSettings({ techProfile: TechProfiles.EGA });

        assert.deepEqual(loadSettings(), {
            ...DEFAULT_SETTINGS,
            techProfile: TechProfiles.EGA,
            unitSystem: UnitSystems.IMPERIAL,
            aiPilotModel: AiPilotModels.SHAW,
        });
    });

    it('maps legacy arcade/realistic flight models to FM2', () => {
        memory.set(STORAGE_KEY, JSON.stringify({
            techProfile: 'SVGA',
            flightModel: 'ARCADE',
            keyboardLayout: 1,
            unitSystem: 'IMPERIAL',
            aiPilotModel: 'SHAW',
        }));

        assert.deepEqual(loadSettings(), {
            techProfile: TechProfiles.SVGA,
            flightModel: FlightModels.FM2,
            keyboardLayout: KeyboardControlLayoutId.QWERTZ,
            unitSystem: UnitSystems.IMPERIAL,
            aiPilotModel: AiPilotModels.SHAW,
        });
    });

    it('falls back invalid fields to defaults', () => {
        memory.set(STORAGE_KEY, JSON.stringify({
            techProfile: 'NOPE',
            flightModel: 'NOPE',
            keyboardLayout: 99,
            unitSystem: 'NOPE',
            aiPilotModel: 'NOPE',
        }));

        assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    });
});
