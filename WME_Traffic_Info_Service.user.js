// ==UserScript==
// @name        WME Traffic Info Service
// @namespace   https://github.com/gk1220
// @version     2026.06.12.00
// @description Overlay Traffic Info Service (TIS) on the WME Map Object
// @author      Gerhard (g1220k)
// @homepageURL https://github.com/gk1220/wme-traffic-info-service
// @supportURL  https://github.com/gk1220/wme-traffic-info-service/issues
// @updateURL
// @downloadURL
// @match       https://www.waze.com/editor*
// @match       https://beta.waze.com/editor*
// @match       https://www.waze.com/*/editor*
// @match       https://beta.waze.com/*/editor*
// @exclude     https://www.waze.com/user/editor*
// @exclude     https://beta.waze.com/user/editor*
// @connect     wms.kbox.at
// @license     GPL-3.0
// @grant       GM_xmlhttpRequest
// @grant       unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const STATES = [
        { abv: 'BU', name: 'Burgenland', url: 'https://wms.kbox.at/TIS/BU.geojson' },
        { abv: 'KA', name: 'Kärnten', url: 'https://wms.kbox.at/TIS/KA.geojson' },
        { abv: 'NO', name: 'Niederösterreich', url: 'https://wms.kbox.at/TIS/NO.geojson' },
        { abv: 'OO', name: 'Oberösterreich', url: 'https://wms.kbox.at/TIS/OO.geojson' },
        { abv: 'SA', name: 'Salzburg', url: 'https://wms.kbox.at/TIS/SA.geojson' },
        { abv: 'ST', name: 'Steiermark', url: 'https://wms.kbox.at/TIS/ST.geojson' },
        { abv: 'TI', name: 'Tirol', url: 'https://wms.kbox.at/TIS/TI.geojson' },
        { abv: 'VO', name: 'Vorarlberg', url: 'https://wms.kbox.at/TIS/VO.geojson' },
        { abv: 'WI', name: 'Wien', url: 'https://wms.kbox.at/TIS/WI.geojson' },
    ];

    const featureMap = new Map();
    const stateMap = new Map();
    const advisoryStore = {
        setStateAdvisories(stateAbv, advisories) {
            for (const [key, adv] of featureMap.entries()) {
                if (adv.stateAbv === stateAbv)
                    featureMap.delete(key);
            }
            stateMap.set(stateAbv, advisories);
            for (const adv of advisories) {
                featureMap.set(adv.id, adv);
            }
        },
        getStateAdvisories(stateAbv) {
            return stateMap.get(stateAbv) ?? [];
        },
        getById(id) {
            return featureMap.get(id);
        },
        clearState(stateAbv) {
            const advisories = stateMap.get(stateAbv) ?? [];
            for (const adv of advisories) {
                featureMap.delete(adv.id);
            }
            stateMap.delete(stateAbv);
        },
        clearAll() {
            featureMap.clear();
            stateMap.clear();
        },
    };

    function fetchGeoJSON(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: (response) => {
                    try {
                        resolve(JSON.parse(response.responseText));
                    }
                    catch (e) {
                        reject(new Error(`[TIS] JSON parse error for ${url}: ${e}`));
                    }
                },
                onerror: (err) => {
                    reject(new Error(`[TIS] Network error for ${url}: ${err.status}`));
                },
                ontimeout: () => {
                    reject(new Error(`[TIS] Timeout for ${url}`));
                },
            });
        });
    }

    const START_TIME_RE = /(vom|von) \d{2}\.\d{2}\.\d{4}( \d{2}:\d{2}( Uhr)?)?/g;
    const END_TIME_RE = /(bis )\d{2}\.\d{2}\.\d{4}( \d{2}:\d{2}( Uhr)?)?/g;
    const LKW_FILTER = 'für LKW über';
    const VALID_TYPES = new Set(['Baustelle', 'Sperre']);
    function classifyIconType(type, desc) {
        if (desc.includes('Fahrstreifen gesperrt') || desc.includes('Standstreifen gesperrt')) {
            return 'roadwork';
        }
        if (desc.includes('gesperrt')) {
            return 'closure';
        }
        return type === 'Baustelle' ? 'roadwork' : 'closure';
    }
    function processGeoJSON(geojson, stateAbv, stateName) {
        if (!geojson?.features || !Array.isArray(geojson.features)) {
            console.warn(`[TIS] No features in GeoJSON for ${stateAbv}`);
            return [];
        }
        const advisories = [];
        for (const feature of geojson.features) {
            if (!feature?.geometry)
                continue;
            const props = feature.properties ?? {};
            const type = props.category ?? '';
            const desc = props.description ?? '';
            if (desc.includes(LKW_FILTER))
                continue;
            if (!VALID_TYPES.has(type))
                continue;
            let lon;
            let lat;
            const geomType = feature.geometry.type;
            if (geomType === 'Point') {
                [lon, lat] = feature.geometry.coordinates;
            }
            else if (geomType === 'LineString') {
                [lon, lat] = feature.geometry.coordinates[0];
            }
            else {
                continue;
            }
            if (!isFinite(lon) || !isFinite(lat))
                continue;
            const iconType = classifyIconType(type, desc);
            const startMatch = desc.match(START_TIME_RE);
            const endMatch = desc.match(END_TIME_RE);
            const guid = props.guid ?? `${lon}_${lat}`;
            const id = `${stateAbv}_${guid}`;
            advisories.push({
                id,
                stateAbv,
                stateName,
                title: props.title ?? '',
                lon,
                lat,
                type,
                iconType,
                desc,
                time: props.pubDate ? new Date(props.pubDate) : new Date(),
                startTime: startMatch ? startMatch[0] : null,
                plannedEndTime: endMatch ? endMatch[0] : null,
                link: props.link ?? '',
                recurrence: null,
            });
        }
        return advisories;
    }

    const SETTINGS_KEY = 'WMETIS_Settings';
    function buildDefaultSettings() {
        const defaults = {
            enabled: true,
            closuresOnly: false,
        };
        for (const s of STATES) {
            defaults[`${s.abv}TISEnabled`] = false;
        }
        return defaults;
    }
    function loadSettings() {
        const defaults = buildDefaultSettings();
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const merged = { ...defaults };
                for (const key of Object.keys(parsed)) {
                    if (typeof parsed[key] === 'boolean') {
                        merged[key] = parsed[key];
                    }
                }
                return merged;
            }
        }
        catch (e) {
            console.warn('[TIS] Failed to load settings:', e);
        }
        return defaults;
    }
    function saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
        catch (e) {
            console.warn('[TIS] Failed to save settings:', e);
        }
    }

    const ROADWORK_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='36'%3E" +
        "%3Cpolygon points='16,2 31,34 1,34' fill='%23FF9900' stroke='%23CC6600' stroke-width='1.5'/%3E" +
        "%3Ctext x='16' y='30' text-anchor='middle' font-size='15' font-family='Arial' fill='white' font-weight='bold'%3EB%3C/text%3E" +
        "%3C/svg%3E";
    const CLOSURE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='36'%3E" +
        "%3Ccircle cx='16' cy='18' r='14' fill='%23CC0000' stroke='%23880000' stroke-width='1.5'/%3E" +
        "%3Ctext x='16' y='24' text-anchor='middle' font-size='15' font-family='Arial' fill='white' font-weight='bold'%3ES%3C/text%3E" +
        "%3C/svg%3E";
    const REPORT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E" +
        "%3Crect x='2' y='4' width='16' height='2' rx='1' fill='%23555'/%3E" +
        "%3Crect x='2' y='9' width='16' height='2' rx='1' fill='%23555'/%3E" +
        "%3Crect x='2' y='14' width='16' height='2' rx='1' fill='%23555'/%3E" +
        "%3C/svg%3E";
    const GOTO_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E" +
        "%3Ccircle cx='10' cy='8' r='4' fill='%231a73e8' stroke='white' stroke-width='1.5'/%3E" +
        "%3Cpath d='M10 13 L10 19' stroke='%231a73e8' stroke-width='2' stroke-linecap='round'/%3E" +
        "%3C/svg%3E";

    const LAYER_PREFIX = 'TIS_';
    let sdk$2;
    function initLayerManager(wmeSDK) {
        sdk$2 = wmeSDK;
    }
    function layerName(stateAbv) {
        return `${LAYER_PREFIX}${stateAbv}`;
    }
    function layerExists(stateAbv) {
        try {
            sdk$2.Map.isLayerVisible({ layerName: layerName(stateAbv) });
            return true;
        }
        catch {
            return false;
        }
    }
    function createLayer(stateAbv) {
        if (layerExists(stateAbv))
            return;
        sdk$2.Map.addLayer({
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
        sdk$2.Events.trackLayerEvents({ layerName: layerName(stateAbv) });
    }
    function removeLayer(stateAbv) {
        if (!layerExists(stateAbv))
            return;
        try {
            sdk$2.Events.stopLayerEventsTracking({ layerName: layerName(stateAbv) });
        }
        catch { }
        try {
            sdk$2.Map.removeLayer({ layerName: layerName(stateAbv) });
        }
        catch { }
    }
    function populateLayer(stateAbv, advisories, closuresOnly) {
        if (!layerExists(stateAbv))
            return;
        try {
            sdk$2.Map.removeAllFeaturesFromLayer({ layerName: layerName(stateAbv) });
        }
        catch {
            return;
        }
        const [left, bottom, right, top] = sdk$2.Map.getMapExtent();
        const features = advisories
            .filter(adv => {
            if (closuresOnly && adv.iconType !== 'closure')
                return false;
            return adv.lon >= left && adv.lon <= right
                && adv.lat >= bottom && adv.lat <= top;
        })
            .map(adv => ({
            id: adv.id,
            type: 'Feature',
            geometry: {
                type: 'Point',
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
        if (features.length === 0)
            return;
        try {
            sdk$2.Map.addFeaturesToLayer({
                layerName: layerName(stateAbv),
                features,
            });
        }
        catch (e) {
            console.warn(`[TIS] Failed to add features to layer ${stateAbv}:`, e);
        }
    }
    function setLayerVisibility(stateAbv, visible) {
        if (!layerExists(stateAbv))
            return;
        try {
            sdk$2.Map.setLayerVisibility({ layerName: layerName(stateAbv), visibility: visible });
        }
        catch { }
    }

    const CSS = `
/* ===== TIS Sidebar Tab ===== */
#tis-panel {
    padding: 8px;
    font-family: 'Rubik', sans-serif;
    font-size: 13px;
    color: #333;
}

#tis-panel h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: #1a73e8;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 4px;
}

/* State table */
#tis-state-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
}

#tis-state-table th {
    background: #f5f5f5;
    padding: 4px 6px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #555;
    border-bottom: 1px solid #ddd;
}

#tis-state-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
}

#tis-state-table td:first-child {
    text-align: center;
    width: 30px;
}

#tis-state-table td:last-child {
    text-align: center;
    width: 32px;
}

.tis-state-checkbox {
    cursor: pointer;
    accent-color: #1a73e8;
    width: 15px;
    height: 15px;
}

.tis-report-btn {
    cursor: pointer;
    background: none;
    border: none;
    padding: 2px;
    border-radius: 3px;
    opacity: 0.7;
    transition: opacity 0.15s;
}

.tis-report-btn:hover {
    opacity: 1;
    background: #e8f0fe;
}

.tis-report-btn img {
    display: block;
    width: 20px;
    height: 20px;
}

/* Options row */
.tis-option-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    margin-top: 4px;
}

.tis-option-row input[type="checkbox"] {
    accent-color: #1a73e8;
    cursor: pointer;
}

.tis-option-row label {
    cursor: pointer;
    user-select: none;
    color: #444;
}

/* Power / enable button */
#tis-power-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    margin-right: 4px;
    padding: 0;
    line-height: 1;
    vertical-align: middle;
    color: #ccc;
    transition: color 0.2s;
}

#tis-power-btn.tis-enabled {
    color: #00c853;
}

/* Version footer */
.tis-footer {
    margin-top: 8px;
    font-size: 11px;
    color: #888;
    border-top: 1px solid #eee;
    padding-top: 4px;
}

/* ===== Marker Popup ===== */
#tis-popup {
    position: fixed;
    z-index: 1100;
    background: #fff;
    border: 1px solid #bbb;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    min-width: 280px;
    max-width: 480px;
    font-family: 'Rubik', sans-serif;
    font-size: 13px;
}

#tis-popup-header {
    background: #1a73e8;
    color: #fff;
    padding: 8px 12px;
    border-radius: 5px 5px 0 0;
    font-weight: 600;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#tis-popup-header .tis-popup-title {
    flex: 1;
    margin-right: 8px;
}

.tis-popup-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    opacity: 0.8;
}

.tis-popup-close:hover { opacity: 1; }

#tis-popup-body {
    padding: 10px 12px;
}

.tis-popup-row {
    margin-bottom: 6px;
    line-height: 1.4;
}

.tis-popup-label {
    font-weight: 600;
    color: #555;
    display: inline-block;
    min-width: 80px;
}

.tis-popup-link a {
    color: #1a73e8;
    text-decoration: none;
}

.tis-popup-link a:hover { text-decoration: underline; }

/* ===== Report Modal ===== */
#tis-report-modal {
    position: fixed;
    z-index: 1100;
    background: #fff;
    border: 1px solid #bbb;
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-family: 'Rubik', sans-serif;
    font-size: 13px;
    min-width: 620px;
}

#tis-report-header {
    background: #1a73e8;
    color: #fff;
    padding: 8px 12px;
    border-radius: 5px 5px 0 0;
    font-weight: 600;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#tis-report-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    padding: 0 2px;
    opacity: 0.8;
}

#tis-report-close:hover { opacity: 1; }

#tis-report-container {
    max-height: 460px;
    overflow-y: auto;
    padding: 0;
}

#tis-report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

#tis-report-table thead th {
    position: sticky;
    top: 0;
    background: #f5f5f5;
    padding: 6px 8px;
    text-align: left;
    border-bottom: 2px solid #ddd;
    font-weight: 600;
    color: #444;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
}

#tis-report-table thead th:hover {
    background: #e8f0fe;
}

#tis-report-table thead th.sort-asc::after { content: ' ▲'; }
#tis-report-table thead th.sort-desc::after { content: ' ▼'; }

#tis-report-table tbody tr:nth-child(even) { background: #f9f9f9; }
#tis-report-table tbody tr:hover { background: #e8f0fe; }

#tis-report-table tbody td {
    padding: 5px 8px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
}

#tis-report-table tbody td:first-child {
    text-align: center;
    width: 28px;
}

#tis-report-table tbody td:nth-child(2) {
    text-align: center;
    width: 28px;
    font-size: 16px;
}

#tis-report-table tbody td:nth-child(3) {
    max-width: 160px;
    font-weight: 600;
}

#tis-report-table tbody td:nth-child(4) {
    max-width: 300px;
    color: #555;
}

#tis-report-table tbody td:last-child {
    white-space: nowrap;
    color: #888;
}

.tis-goto-btn {
    cursor: pointer;
    background: none;
    border: none;
    padding: 2px;
    border-radius: 3px;
    opacity: 0.7;
    transition: opacity 0.15s;
}

.tis-goto-btn:hover {
    opacity: 1;
    background: #e8f0fe;
}

.tis-goto-btn img {
    display: block;
    width: 20px;
    height: 20px;
}

/* Spinner */
.tis-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #888;
    font-size: 13px;
}
`;
    function injectStyles() {
        if (document.getElementById('tis-styles'))
            return;
        const style = document.createElement('style');
        style.id = 'tis-styles';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    const SCRIPT_VERSION = '2026.06.12.00';
    let tabPane;
    let powerBtn;
    async function setupTab(sdk, states, settings, callbacks) {
        const { tabLabel, tabPane: pane } = await sdk.Sidebar.registerScriptTab();
        tabPane = pane;
        powerBtn = document.createElement('button');
        powerBtn.id = 'tis-power-btn';
        powerBtn.className = settings.enabled ? 'tis-enabled' : '';
        powerBtn.title = 'TIS ein-/ausschalten';
        powerBtn.textContent = '⏻';
        powerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const next = !powerBtn.classList.contains('tis-enabled');
            setPowerState(next);
            callbacks.onPowerToggle(next);
        });
        tabLabel.appendChild(powerBtn);
        tabLabel.appendChild(document.createTextNode('TIS'));
        tabPane.id = 'tis-panel';
        const stateRows = states.map(s => `
        <tr>
            <td>
                <input
                    type="checkbox"
                    class="tis-state-checkbox"
                    id="tis-chk-${s.abv}"
                    ${settings[`${s.abv}TISEnabled`] ? 'checked' : ''}
                >
            </td>
            <td>${s.name}</td>
            <td>
                <button
                    class="tis-report-btn"
                    data-state-abv="${s.abv}"
                    data-state-name="${s.name}"
                    title="Liste anzeigen – ${s.name}"
                >
                    <img src="${REPORT_ICON}" alt="Liste">
                </button>
            </td>
        </tr>
    `).join('');
        tabPane.innerHTML = `
        <div id="tis-panel">
            <h3>WME Traffic Info Service</h3>
            <table id="tis-state-table">
                <thead>
                    <tr>
                        <th title="Aktiv">☑</th>
                        <th>Bundesland</th>
                        <th title="Liste anzeigen">☰</th>
                    </tr>
                </thead>
                <tbody>${stateRows}</tbody>
            </table>

            <div class="tis-option-row">
                <input
                    type="checkbox"
                    id="tis-closures-only"
                    ${settings.closuresOnly ? 'checked' : ''}
                >
                <label for="tis-closures-only">Nur Sperren anzeigen</label>
            </div>

            <div class="tis-footer">
                WME Traffic Info Service v${SCRIPT_VERSION}<br>
                Daten: <a href="https://wms.kbox.at" target="_blank" rel="noopener">wms.kbox.at</a>
            </div>
        </div>
    `;
        for (const s of states) {
            const chk = tabPane.querySelector(`#tis-chk-${s.abv}`);
            chk?.addEventListener('change', () => {
                callbacks.onStateToggle(s.abv, chk.checked);
            });
        }
        const closuresChk = tabPane.querySelector('#tis-closures-only');
        closuresChk?.addEventListener('change', () => {
            callbacks.onClosuresOnlyChange(closuresChk.checked);
        });
        tabPane.querySelectorAll('.tis-report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const abv = btn.dataset['stateAbv'] ?? '';
                const name = btn.dataset['stateName'] ?? '';
                callbacks.onReportRequest(abv, name);
            });
        });
    }
    function setPowerState(enabled) {
        if (!powerBtn)
            return;
        powerBtn.classList.toggle('tis-enabled', enabled);
    }

    let sdk$1;
    function initPopup(wmeSDK) {
        sdk$1 = wmeSDK;
    }
    function makeDraggable(el, handleEl) {
        let x0 = 0, y0 = 0, mx = 0, my = 0;
        handleEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            mx = e.clientX;
            my = e.clientY;
            const move = (ev) => {
                x0 = mx - ev.clientX;
                y0 = my - ev.clientY;
                mx = ev.clientX;
                my = ev.clientY;
                el.style.top = (el.offsetTop - y0) + 'px';
                el.style.left = (el.offsetLeft - x0) + 'px';
            };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    }
    function removeExisting(id) {
        document.getElementById(id)?.remove();
    }
    function showAdvisoryPopup(adv) {
        removeExisting('tis-popup');
        const typeLabel = adv.iconType === 'roadwork' ? '🚧 Baustelle' : '🚫 Sperre';
        const popup = document.createElement('div');
        popup.id = 'tis-popup';
        popup.style.top = '120px';
        popup.style.left = '360px';
        popup.innerHTML = `
        <div id="tis-popup-header">
            <span class="tis-popup-title">${escHtml(adv.title)}</span>
            <button class="tis-popup-close" id="tis-popup-close" title="Schließen">✕</button>
        </div>
        <div id="tis-popup-body">
            <div class="tis-popup-row">
                <span class="tis-popup-label">Typ:</span> ${typeLabel}
            </div>
            <div class="tis-popup-row">
                <span class="tis-popup-label">Bundesland:</span> ${escHtml(adv.stateName)}
            </div>
            <div class="tis-popup-row">
                <span class="tis-popup-label">Veröffentlicht:</span> ${adv.time.toLocaleDateString('de-AT')}
            </div>
            ${adv.startTime ? `<div class="tis-popup-row"><span class="tis-popup-label">Start:</span> ${escHtml(adv.startTime)}</div>` : ''}
            ${adv.plannedEndTime ? `<div class="tis-popup-row"><span class="tis-popup-label">Geplantes Ende:</span> ${escHtml(adv.plannedEndTime)}</div>` : ''}
            ${adv.recurrence ? `<div class="tis-popup-row"><span class="tis-popup-label">Wiederholung:</span> ${escHtml(adv.recurrence)}</div>` : ''}
            <hr style="margin:8px 0;border:none;border-top:1px solid #eee;">
            <div class="tis-popup-row">${escHtml(adv.desc)}</div>
            ${adv.link ? `<div class="tis-popup-row tis-popup-link"><a href="${escHtml(adv.link)}" target="_blank" rel="noopener noreferrer">ÖAMTC Routenplaner</a></div>` : ''}
        </div>
    `;
        document.body.appendChild(popup);
        makeDraggable(popup, popup.querySelector('#tis-popup-header'));
        document.getElementById('tis-popup-close').addEventListener('click', () => {
            removeExisting('tis-popup');
        });
        sdk$1.Map.setMapCenter({ lonLat: { lon: adv.lon, lat: adv.lat } });
    }
    let sortColIndex = 4;
    let sortAsc = false;
    function showReportModal(stateName, advisories, closuresOnly) {
        removeExisting('tis-report-modal');
        const filtered = closuresOnly
            ? advisories.filter(a => a.iconType === 'closure')
            : advisories;
        const modal = document.createElement('div');
        modal.id = 'tis-report-modal';
        modal.style.top = '100px';
        modal.style.left = '350px';
        modal.innerHTML = `
        <div id="tis-report-header">
            <span>${escHtml(stateName)} – Verkehrsmeldungen (${filtered.length})</span>
            <button id="tis-report-close" title="Schließen">✕</button>
        </div>
        <div id="tis-report-container">
            <table id="tis-report-table">
                <thead>
                    <tr>
                        <th data-col="0"></th>
                        <th data-col="1">Typ</th>
                        <th data-col="2">Titel</th>
                        <th data-col="3">Beschreibung</th>
                        <th data-col="4">Seit</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
        document.body.appendChild(modal);
        makeDraggable(modal, modal.querySelector('#tis-report-header'));
        document.getElementById('tis-report-close').addEventListener('click', () => {
            removeExisting('tis-report-modal');
        });
        const tbody = modal.querySelector('tbody');
        renderReportRows(tbody, filtered);
        sortColIndex = 4;
        sortAsc = false;
        modal.querySelectorAll('#tis-report-table thead th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const col = parseInt(th.dataset['col'] ?? '0', 10);
                if (col === 0)
                    return;
                if (sortColIndex === col) {
                    sortAsc = !sortAsc;
                }
                else {
                    sortColIndex = col;
                    sortAsc = true;
                }
                modal.querySelectorAll('thead th').forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
                const sorted = sortAdvisories([...filtered], sortColIndex, sortAsc);
                tbody.innerHTML = '';
                renderReportRows(tbody, sorted);
                attachGotoListeners(tbody);
            });
        });
        const initialTh = modal.querySelector(`thead th[data-col="4"]`);
        if (initialTh)
            initialTh.classList.add('sort-desc');
        attachGotoListeners(tbody);
    }
    function renderReportRows(tbody, advisories) {
        advisories.forEach(adv => {
            const tr = document.createElement('tr');
            const icon = adv.iconType === 'roadwork' ? '🚧' : '🚫';
            tr.innerHTML = `
            <td><button class="tis-goto-btn" data-lat="${adv.lat}" data-lon="${adv.lon}" title="Zur Meldung navigieren"><img src="${GOTO_ICON}" alt="⟶"></button></td>
            <td title="${adv.type}">${icon}</td>
            <td>${escHtml(adv.title)}</td>
            <td>${escHtml(adv.desc)}</td>
            <td>${adv.time.toLocaleDateString('de-AT')}</td>
        `;
            tbody.appendChild(tr);
        });
    }
    function attachGotoListeners(tbody) {
        tbody.querySelectorAll('.tis-goto-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lat = parseFloat(btn.dataset['lat'] ?? '0');
                const lon = parseFloat(btn.dataset['lon'] ?? '0');
                sdk$1.Map.setMapCenter({ lonLat: { lon, lat }, zoomLevel: 18 });
            });
        });
    }
    function sortAdvisories(advisories, colIndex, ascending) {
        const getValue = (adv) => {
            switch (colIndex) {
                case 1: return adv.iconType;
                case 2: return adv.title.toLowerCase();
                case 3: return adv.desc.toLowerCase();
                case 4: return adv.time.toISOString();
                default: return '';
            }
        };
        return advisories.sort((a, b) => {
            const va = getValue(a);
            const vb = getValue(b);
            if (va < vb)
                return ascending ? -1 : 1;
            if (va > vb)
                return ascending ? 1 : -1;
            return 0;
        });
    }
    function escHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function getSDK() {
        const win = window.unsafeWindow ?? window;
        if (!win.SDK_INITIALIZED) {
            throw new Error('[TIS] SDK_INITIALIZED promise not found');
        }
        await win.SDK_INITIALIZED;
        if (!win.getWmeSdk) {
            throw new Error('[TIS] getWmeSdk not available');
        }
        const sdk = win.getWmeSdk({
            scriptId: 'wme-traffic-info-service',
            scriptName: 'WME Traffic Info Service',
        });
        console.log('[TIS] WME SDK initialized:', sdk.getSDKVersion());
        return sdk;
    }
    let sdk;
    let settings = loadSettings();
    async function loadState(stateAbv) {
        const stateInfo = STATES.find(s => s.abv === stateAbv);
        if (!stateInfo)
            return;
        try {
            const geojson = await fetchGeoJSON(stateInfo.url);
            const advisories = processGeoJSON(geojson, stateAbv, stateInfo.name);
            advisoryStore.setStateAdvisories(stateAbv, advisories);
            populateLayer(stateAbv, advisories, settings.closuresOnly);
            console.log(`[TIS] Loaded ${advisories.length} advisories for ${stateAbv}`);
        }
        catch (e) {
            console.error(`[TIS] Failed to load ${stateAbv}:`, e);
        }
    }
    async function loadEnabledStates() {
        const promises = [];
        for (const s of STATES) {
            if (settings[`${s.abv}TISEnabled`]) {
                promises.push(loadState(s.abv));
            }
        }
        await Promise.all(promises);
    }
    function enableState(stateAbv) {
        createLayer(stateAbv);
        loadState(stateAbv);
    }
    function disableState(stateAbv) {
        advisoryStore.clearState(stateAbv);
        removeLayer(stateAbv);
    }
    function refreshLayers() {
        for (const s of STATES) {
            if (!settings[`${s.abv}TISEnabled`] || !settings.enabled)
                continue;
            const cached = advisoryStore.getStateAdvisories(s.abv);
            if (cached.length > 0) {
                populateLayer(s.abv, cached, settings.closuresOnly);
            }
        }
    }
    async function refreshAll() {
        advisoryStore.clearAll();
        await loadEnabledStates();
    }
    async function main() {
        sdk = await getSDK();
        initLayerManager(sdk);
        initPopup(sdk);
        injectStyles();
        await setupTab(sdk, STATES, settings, {
            onStateToggle(stateAbv, enabled) {
                settings[`${stateAbv}TISEnabled`] = enabled;
                saveSettings(settings);
                if (enabled) {
                    enableState(stateAbv);
                }
                else {
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
                        showReportModal(stateName, advisoryStore.getStateAdvisories(stateAbv), settings.closuresOnly);
                    });
                }
                else {
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
        for (const s of STATES) {
            if (settings[`${s.abv}TISEnabled`]) {
                createLayer(s.abv);
            }
        }
        await loadEnabledStates();
        if (!settings.enabled) {
            for (const s of STATES) {
                if (settings[`${s.abv}TISEnabled`]) {
                    setLayerVisibility(s.abv, false);
                }
            }
        }
        sdk.Events.on({
            eventName: 'wme-map-move-end',
            eventHandler: () => {
                if (settings.enabled)
                    refreshLayers();
            },
        });
        sdk.Events.on({
            eventName: 'wme-map-data-loaded',
            eventHandler: () => {
                if (settings.enabled)
                    refreshAll();
            },
        });
        sdk.Events.on({
            eventName: 'wme-layer-feature-clicked',
            eventHandler: ({ featureId, layerName: clickedLayer }) => {
                if (!clickedLayer.startsWith('TIS_'))
                    return;
                const adv = advisoryStore.getById(String(featureId));
                if (adv)
                    showAdvisoryPopup(adv);
            },
        });
        console.log('[TIS] WME Traffic Info Service v2026.06.12.00 ready.');
    }
    main().catch(err => {
        console.error('[TIS] Fatal initialization error:', err);
    });

})();
