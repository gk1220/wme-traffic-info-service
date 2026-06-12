// WME Traffic Info Service - Popup Dialogs
// Marker click popup and report modal

import { Advisory } from '../core/types';
import { GOTO_ICON } from '../utils/icons';
import { WmeSDK } from 'wme-sdk-typings';

let sdk: WmeSDK;

export function initPopup(wmeSDK: WmeSDK): void {
    sdk = wmeSDK;
}

// ─── Draggable utility ────────────────────────────────────────────────────────

function makeDraggable(el: HTMLElement, handleEl: HTMLElement): void {
    let x0 = 0, y0 = 0, mx = 0, my = 0;

    handleEl.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        mx = e.clientX;
        my = e.clientY;

        const move = (ev: MouseEvent) => {
            x0 = mx - ev.clientX;
            y0 = my - ev.clientY;
            mx = ev.clientX;
            my = ev.clientY;
            el.style.top  = (el.offsetTop  - y0) + 'px';
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

function removeExisting(id: string): void {
    document.getElementById(id)?.remove();
}

// ─── Marker Popup ─────────────────────────────────────────────────────────────

export function showAdvisoryPopup(adv: Advisory): void {
    removeExisting('tis-popup');

    const typeLabel = adv.iconType === 'roadwork' ? '🚧 Baustelle' : '🚫 Sperre';

    const popup = document.createElement('div');
    popup.id = 'tis-popup';
    popup.style.top  = '120px';
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
    makeDraggable(popup, popup.querySelector('#tis-popup-header') as HTMLElement);

    document.getElementById('tis-popup-close')!.addEventListener('click', () => {
        removeExisting('tis-popup');
    });

    // Center map on advisory
    sdk.Map.setMapCenter({ lonLat: { lon: adv.lon, lat: adv.lat } });
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

interface ReportColumn {
    key: string;
    label: string;
}

const COLUMNS: ReportColumn[] = [
    { key: '_goto',  label: '⟶' },
    { key: 'icon',   label: 'Typ' },
    { key: 'title',  label: 'Titel' },
    { key: 'desc',   label: 'Beschreibung' },
    { key: 'date',   label: 'Seit' },
];

let sortColIndex = 4; // default: date
let sortAsc = false;

export function showReportModal(
    stateName: string,
    advisories: Advisory[],
    closuresOnly: boolean
): void {
    removeExisting('tis-report-modal');

    const filtered = closuresOnly
        ? advisories.filter(a => a.iconType === 'closure')
        : advisories;

    const modal = document.createElement('div');
    modal.id = 'tis-report-modal';
    modal.style.top  = '100px';
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
    makeDraggable(modal, modal.querySelector('#tis-report-header') as HTMLElement);

    document.getElementById('tis-report-close')!.addEventListener('click', () => {
        removeExisting('tis-report-modal');
    });

    const tbody = modal.querySelector('tbody')!;
    renderReportRows(tbody, filtered);

    // Sortable headers
    sortColIndex = 4;
    sortAsc = false;
    modal.querySelectorAll('#tis-report-table thead th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const col = parseInt((th as HTMLElement).dataset['col'] ?? '0', 10);
            if (col === 0) return; // goto column not sortable
            if (sortColIndex === col) {
                sortAsc = !sortAsc;
            } else {
                sortColIndex = col;
                sortAsc = true;
            }
            // Update header classes
            modal.querySelectorAll('thead th').forEach(h => {
                (h as HTMLElement).classList.remove('sort-asc', 'sort-desc');
            });
            (th as HTMLElement).classList.add(sortAsc ? 'sort-asc' : 'sort-desc');

            const sorted = sortAdvisories([...filtered], sortColIndex, sortAsc);
            tbody.innerHTML = '';
            renderReportRows(tbody, sorted);
            attachGotoListeners(tbody);
        });
    });

    // Mark initial sort column
    const initialTh = modal.querySelector(`thead th[data-col="4"]`) as HTMLElement;
    if (initialTh) initialTh.classList.add('sort-desc');

    attachGotoListeners(tbody);
}

function renderReportRows(tbody: HTMLElement, advisories: Advisory[]): void {
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

function attachGotoListeners(tbody: HTMLElement): void {
    tbody.querySelectorAll('.tis-goto-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lat = parseFloat((btn as HTMLElement).dataset['lat'] ?? '0');
            const lon = parseFloat((btn as HTMLElement).dataset['lon'] ?? '0');
            sdk.Map.setMapCenter({ lonLat: { lon, lat }, zoomLevel: 18 as any });
        });
    });
}

function sortAdvisories(
    advisories: Advisory[],
    colIndex: number,
    ascending: boolean
): Advisory[] {
    const getValue = (adv: Advisory): string => {
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
        if (va < vb) return ascending ? -1 : 1;
        if (va > vb) return ascending ? 1 : -1;
        return 0;
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
