import { KeyboardControlLayoutId } from "../input/keyboardLayouts";
import { AiPilotModels, FlightModels, TechProfiles, UnitSystems } from "../state/gameDefs";

const STORAGE_KEY = 'retroflightsim.settings';

/** Older builds stored arcade/realistic; map them onto the unified FM2 model. */
const LEGACY_FLIGHT_MODELS: Record<string, FlightModels> = {
    ARCADE: FlightModels.FM2,
    REALISTIC: FlightModels.FM2,
};

export interface AppSettings {
    techProfile: string;
    flightModel: string;
    keyboardLayout: KeyboardControlLayoutId;
    unitSystem: UnitSystems;
    aiPilotModel: AiPilotModels;
}

export const DEFAULT_SETTINGS: AppSettings = {
    techProfile: TechProfiles.HD,
    flightModel: FlightModels.FM2,
    keyboardLayout: KeyboardControlLayoutId.ARROWS,
    unitSystem: UnitSystems.METRIC,
    aiPilotModel: AiPilotModels.CLASSIC,
};

const TECH_PROFILES = new Set<string>(Object.values(TechProfiles));
const FLIGHT_MODELS = new Set<string>(Object.values(FlightModels));
const UNIT_SYSTEMS = new Set<string>(Object.values(UnitSystems));
const AI_PILOT_MODELS = new Set<string>(Object.values(AiPilotModels));
const KEYBOARD_LAYOUTS = new Set<number>(
    Object.values(KeyboardControlLayoutId).filter((v): v is number => typeof v === 'number'),
);

export function loadSettings(): AppSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_SETTINGS };
        }

        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        return {
            techProfile: isValidTechProfile(parsed.techProfile) ? parsed.techProfile : DEFAULT_SETTINGS.techProfile,
            flightModel: resolveFlightModel(parsed.flightModel),
            keyboardLayout: isValidKeyboardLayout(parsed.keyboardLayout) ? parsed.keyboardLayout : DEFAULT_SETTINGS.keyboardLayout,
            unitSystem: isValidUnitSystem(parsed.unitSystem) ? parsed.unitSystem : DEFAULT_SETTINGS.unitSystem,
            aiPilotModel: isValidAiPilotModel(parsed.aiPilotModel) ? parsed.aiPilotModel : DEFAULT_SETTINGS.aiPilotModel,
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Ignore quota / private-mode failures; settings still apply for the session.
    }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
    const next = { ...loadSettings(), ...partial };
    saveSettings(next);
    return next;
}

function resolveFlightModel(value: unknown): string {
    if (typeof value !== 'string') {
        return DEFAULT_SETTINGS.flightModel;
    }
    if (FLIGHT_MODELS.has(value)) {
        return value;
    }
    return LEGACY_FLIGHT_MODELS[value] ?? DEFAULT_SETTINGS.flightModel;
}

function isValidTechProfile(value: unknown): value is string {
    return typeof value === 'string' && TECH_PROFILES.has(value);
}

function isValidUnitSystem(value: unknown): value is UnitSystems {
    return typeof value === 'string' && UNIT_SYSTEMS.has(value);
}

function isValidAiPilotModel(value: unknown): value is AiPilotModels {
    return typeof value === 'string' && AI_PILOT_MODELS.has(value);
}

function isValidKeyboardLayout(value: unknown): value is KeyboardControlLayoutId {
    return typeof value === 'number' && KEYBOARD_LAYOUTS.has(value);
}
