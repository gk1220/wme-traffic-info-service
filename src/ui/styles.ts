// WME Traffic Info Service - CSS Styles

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

export function injectStyles(): void {
    if (document.getElementById('tis-styles')) return;
    const style = document.createElement('style');
    style.id = 'tis-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
}
