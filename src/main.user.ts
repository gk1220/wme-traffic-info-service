// WME Traffic Info Service - Main Entry Point

import { WmeSDK } from 'wme-sdk-typings';

import { STATES } from './data/stateConfig';
import { advisoryStore } from './data/store';
import { fetchGeoJSON } from './data/api';
import { processGeoJSON } from './logic/advisoryProcessor';
import { loadSettings, saveSettings } from './core/settings';
import { TISSettings } from './core/types';
import {
    initLayerManager,
    createLayer,
    removeLayer,
    populateLayer,
    setLayerVisibility,
} from './map/layerManager';
import { injectStyles } from './ui/styles';
import { setupTab, setPowerState } from './ui/tab';
import { initPopup, showAdvisoryPopup, showReportModal } from './ui/popup';

// ─── SDK bootstrap ────────────────────────────────────────────────────────────

async function getSDK(): Promise<WmeSDK> {
    const win = (window as any).unsafeWindow ?? window;

    if (!win.SDK_INITIALIZED) {
        throw new Error('[TIS] SDK_INITIALIZED promise not found');
    }
    await win.SDK_INITIALIZED;

    if (!win.getWmeSdk) {
        throw new Error('[TIS] getWmeSdk not available');
    }

    const sdk: WmeSDK = win.getWmeSdk({
        scriptId:   'wme-traffic-info-service',
        scriptName: 'WME Traffic Info Service',
    });

    console.log('[TIS] WME SDK initialized:', sdk.getSDKVersion());
    return sdk;
}

// ─── Application state ────────────────────────────────────────────────────────

let sdk: WmeSDK;
let settings: TISSettings = loadSettings();

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadState(stateAbv: string): Promise<void> {
    const stateInfo = STATES.find(s => s.abv === stateAbv);
    if (!stateInfo) return;

    try {
        const geojson = await fetchGeoJSON(stateInfo.url);
        const advisories = processGeoJSON(geojson, stateAbv, stateInfo.name);
        advisoryStore.setStateAdvisories(stateAbv, advisories);
        populateLayer(stateAbv, advisories, settings.closuresOnly);
        console.log(`[TIS] Loaded ${advisories.length} advisories for ${stateAbv}`);
    } catch (e) {
        console.error(`[TIS] Failed to load ${stateAbv}:`, e);
    }
}

async function loadEnabledStates(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const s of STATES) {
        if (settings[`${s.abv}TISEnabled`]) {
            promises.push(loadState(s.abv));
        }
    }
    await Promise.all(promises);
}

// ─── Layer management helpers ─────────────────────────────────────────────────

function enableState(stateAbv: string): void {
    createLayer(stateAbv);
    loadState(stateAbv);
}

function disableState(stateAbv: string): void {
    advisoryStore.clearState(stateAbv);
    removeLayer(stateAbv);
}

/** Repopulate visible layers with current cache (e.g. after map move) */
function refreshLayers(): void {
    for (const s of STATES) {
        if (!settings[`${s.abv}TISEnabled`] || !settings.enabled) continue;
        const cached = advisoryStore.getStateAdvisories(s.abv);
        if (cached.length > 0) {
            populateLayer(s.abv, cached, settings.closuresOnly);
        }
    }
}

/** Re-fetch all enabled states from the API */
async function refreshAll(): Promise<void> {
    advisoryStore.clearAll();
    await loadEnabledStates();
}

// ─── Main bootstrap ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
    sdk = await getSDK();

    initLayerManager(sdk);
    initPopup(sdk);
    injectStyles();

    // ── Sidebar tab ──────────────────────────────────────────────────────────
    await setupTab(sdk, STATES, settings, {
        onStateToggle(stateAbv, enabled) {
            settings[`${stateAbv}TISEnabled`] = enabled;
            saveSettings(settings);
            if (enabled) {
                enableState(stateAbv);
            } else {
                disableState(stateAbv);
            }
        },

        onClosuresOnlyChange(value) {
            settings.closuresOnly = value;
            saveSettings(settings);
            refreshLayers();
        },

        onReportRequest(stateAbv, stateName) {
            const advisories = advisoryStore.getStateAdvisories(stateAbv);
            if (advisories.length === 0) {
                loadState(stateAbv).then(() => {
                    showReportModal(
                        stateName,
                        advisoryStore.getStateAdvisories(stateAbv),
                        settings.closuresOnly
                    );
                });
            } else {
                showReportModal(stateName, advisories, settings.closuresOnly);
            }
        },

        onPowerToggle(enabled) {
            settings.enabled = enabled;
            saveSettings(settings);
            setPowerState(enabled);
            for (const s of STATES) {
                if (settings[`${s.abv}TISEnabled`]) {
                    setLayerVisibility(s.abv, enabled);
                }
            }
        },
    });

    // ── Create layers and load initial data ──────────────────────────────────
    for (const s of STATES) {
        if (settings[`${s.abv}TISEnabled`]) {
            createLayer(s.abv);
        }
    }
    await loadEnabledStates();

    // Apply global enable state after loading
    if (!settings.enabled) {
        for (const s of STATES) {
            if (settings[`${s.abv}TISEnabled`]) {
                setLayerVisibility(s.abv, false);
            }
        }
    }

    // ── SDK event listeners ──────────────────────────────────────────────────

    // Repopulate visible layers when map pan/zoom finishes
    sdk.Events.on({
        eventName: 'wme-map-move-end',
        eventHandler: () => {
            if (settings.enabled) refreshLayers();
        },
    });

    // Re-fetch when WME reloads map data (user pressed refresh)
    sdk.Events.on({
        eventName: 'wme-map-data-loaded',
        eventHandler: () => {
            if (settings.enabled) refreshAll();
        },
    });

    // Handle marker clicks – show advisory popup
    sdk.Events.on({
        eventName: 'wme-layer-feature-clicked',
        eventHandler: ({ featureId, layerName: clickedLayer }) => {
            if (!(clickedLayer as string).startsWith('TIS_')) return;
            const adv = advisoryStore.getById(String(featureId));
            if (adv) showAdvisoryPopup(adv);
        },
    });

    console.log('[TIS] WME Traffic Info Service v2026.06.12.01 ready.');
}

// Run
main().catch(err => {
    console.error('[TIS] Fatal initialization error:', err);
});