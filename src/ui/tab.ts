// WME Traffic Info Service - Sidebar Tab
// Builds and manages the WME Scripts sidebar tab

import { WmeSDK } from 'wme-sdk-typings';
import { TISSettings, StateInfo } from '../core/types';
import { REPORT_ICON } from '../utils/icons';

const SCRIPT_VERSION = '2026.06.12.01';

export interface TabCallbacks {
    onStateToggle: (stateAbv: string, enabled: boolean) => void;
    onClosuresOnlyChange: (value: boolean) => void;
    onReportRequest: (stateAbv: string, stateName: string) => void;
    onPowerToggle: (enabled: boolean) => void;
}

let tabPane: HTMLElement;
let powerBtn: HTMLButtonElement;

/**
 * Register the TIS tab in the WME sidebar and build the UI.
 */
export async function setupTab(
    sdk: WmeSDK,
    states: StateInfo[],
    settings: TISSettings,
    callbacks: TabCallbacks
): Promise<void> {
    const { tabLabel, tabPane: pane } = await sdk.Sidebar.registerScriptTab();
    tabPane = pane;

    // Tab label
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

    // Tab pane content
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

    // Wire state checkboxes
    for (const s of states) {
        const chk = tabPane.querySelector(`#tis-chk-${s.abv}`) as HTMLInputElement;
        chk?.addEventListener('change', () => {
            callbacks.onStateToggle(s.abv, chk.checked);
        });
    }

    // Wire "closures only" checkbox
    const closuresChk = tabPane.querySelector('#tis-closures-only') as HTMLInputElement;
    closuresChk?.addEventListener('change', () => {
        callbacks.onClosuresOnlyChange(closuresChk.checked);
    });

    // Wire report buttons
    tabPane.querySelectorAll('.tis-report-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const abv  = (btn as HTMLElement).dataset['stateAbv']  ?? '';
            const name = (btn as HTMLElement).dataset['stateName'] ?? '';
            callbacks.onReportRequest(abv, name);
        });
    });
}

/** Updates the visual state of the power button */
export function setPowerState(enabled: boolean): void {
    if (!powerBtn) return;
    powerBtn.classList.toggle('tis-enabled', enabled);
}

/** Updates a state checkbox programmatically */
export function setStateChecked(stateAbv: string, checked: boolean): void {
    if (!tabPane) return;
    const chk = tabPane.querySelector(`#tis-chk-${stateAbv}`) as HTMLInputElement | null;
    if (chk) chk.checked = checked;
}
