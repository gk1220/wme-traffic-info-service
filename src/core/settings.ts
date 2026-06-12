// WME Traffic Info Service - Settings Management

import { TISSettings } from './types';
import { STATES } from '../data/stateConfig';

const SETTINGS_KEY = 'WMETIS_Settings';

function buildDefaultSettings(): TISSettings {
    const defaults: TISSettings = {
        enabled: true,
        closuresOnly: false,
    };
    for (const s of STATES) {
        defaults[`${s.abv}TISEnabled`] = false;
    }
    return defaults;
}

export function loadSettings(): TISSettings {
    const defaults = buildDefaultSettings();
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<TISSettings>;
            // Merge: only copy keys that are known booleans
            const merged = { ...defaults };
            for (const key of Object.keys(parsed) as Array<keyof TISSettings>) {
                if (typeof parsed[key] === 'boolean') {
                    (merged as any)[key] = parsed[key];
                }
            }
            return merged;
        }
    } catch (e) {
        console.warn('[TIS] Failed to load settings:', e);
    }
    return defaults;
}

export function saveSettings(settings: TISSettings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('[TIS] Failed to save settings:', e);
    }
}
