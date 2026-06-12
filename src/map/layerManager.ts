// WME Traffic Info Service - Map Layer Manager
// Manages SDK feature layers for each Austrian state

import { WmeSDK } from 'wme-sdk-typings';
import { Advisory } from '../core/types';
import { ROADWORK_ICON, CLOSURE_ICON } from '../utils/icons';

const LAYER_PREFIX = 'TIS_';

let sdk: WmeSDK;

export function initLayerManager(wmeSDK: WmeSDK): void {
    sdk = wmeSDK;
}

export function layerName(stateAbv: string): string {
    return `${LAYER_PREFIX}${stateAbv}`;
}

/** Returns true if the layer already exists in the SDK */
export function layerExists(stateAbv: string): boolean {
    try {
        sdk.Map.isLayerVisible({ layerName: layerName(stateAbv) });
        return true;
    } catch {
        return false;
    }
}

/** Creates an SDK feature layer for the given state with icon style rules */
export function createLayer(stateAbv: string): void {
    if (layerExists(stateAbv)) return;

    sdk.Map.addLayer({
        layerName: layerName(stateAbv),
        styleRules: [
            {
                predicate: (props) => props['iconType'] === 'roadwork',
                style: {
                    externalGraphic: ROADWORK_ICON,
                    graphicWidth: 32,
                    graphicHeight: 32,
                    graphicXOffset: -16,
                    graphicYOffset: -32,
                    fillOpacity: 1,
                    cursor: 'pointer',
                },
            },
            {
                predicate: (props) => props['iconType'] === 'closure',
                style: {
                    externalGraphic: CLOSURE_ICON,
                    graphicWidth: 32,
                    graphicHeight: 32,
                    graphicXOffset: -16,
                    graphicYOffset: -32,
                    fillOpacity: 1,
                    cursor: 'pointer',
                },
            },
        ],
    });

    // Enable click events for the layer
    sdk.Events.trackLayerEvents({ layerName: layerName(stateAbv) });
}

/** Removes the SDK layer for the given state */
export function removeLayer(stateAbv: string): void {
    if (!layerExists(stateAbv)) return;
    try {
        sdk.Events.stopLayerEventsTracking({ layerName: layerName(stateAbv) });
    } catch { /* ignore */ }
    try {
        sdk.Map.removeLayer({ layerName: layerName(stateAbv) });
    } catch { /* ignore */ }
}

/**
 * Populates a state layer with advisories, filtered by map bounds and the
 * optional "closures only" toggle.
 */
export function populateLayer(
    stateAbv: string,
    advisories: Advisory[],
    closuresOnly: boolean
): void {
    if (!layerExists(stateAbv)) return;

    // Clear existing features
    try {
        sdk.Map.removeAllFeaturesFromLayer({ layerName: layerName(stateAbv) });
    } catch { return; }

    // Current map extent in WGS84: [left, bottom, right, top]
    const [left, bottom, right, top] = sdk.Map.getMapExtent();

    const features = advisories
        .filter(adv => {
            if (closuresOnly && adv.iconType !== 'closure') return false;
            // Bounds check – only render markers visible in current viewport
            return adv.lon >= left && adv.lon <= right
                && adv.lat >= bottom && adv.lat <= top;
        })
        .map(adv => ({
            id: adv.id,
            type: 'Feature' as const,
            geometry: {
                type: 'Point' as const,
                coordinates: [adv.lon, adv.lat],
            },
            properties: {
                iconType: adv.iconType,
                title: adv.title,
                desc: adv.desc,
                stateAbv: adv.stateAbv,
                stateName: adv.stateName,
                timestamp: adv.time.toLocaleDateString('de-AT'),
                startTime: adv.startTime ?? '',
                plannedEndTime: adv.plannedEndTime ?? '',
                recurrence: adv.recurrence ?? '',
                link: adv.link,
                lat: adv.lat,
                lon: adv.lon,
            },
        }));

    if (features.length === 0) return;

    try {
        sdk.Map.addFeaturesToLayer({
            layerName: layerName(stateAbv),
            features,
        });
    } catch (e) {
        console.warn(`[TIS] Failed to add features to layer ${stateAbv}:`, e);
    }
}

/** Show or hide a state layer without removing it */
export function setLayerVisibility(stateAbv: string, visible: boolean): void {
    if (!layerExists(stateAbv)) return;
    try {
        sdk.Map.setLayerVisibility({ layerName: layerName(stateAbv), visibility: visible });
    } catch { /* ignore */ }
}
