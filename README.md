# WME Traffic Info Service

Ein [Tampermonkey](https://www.tampermonkey.net/) Userscript für den [Waze Map Editor (WME)](https://www.waze.com/editor), das österreichische Verkehrsmeldungen (TIS – Traffic Info Service) direkt auf der WME-Karte einblendet.

> **Version:** 2026.06.12.01  
> **Autor:** Gerhard (g1220k)  
> **Lizenz:** GPL-3.0  

---

## Funktionsumfang

- **Verkehrsmeldungen aller 9 österreichischen Bundesländer** als Kartenmarker (Baustellen 🚧 und Sperren 🚫)
- **Datenquelle:** [wms.kbox.at](https://wms.kbox.at) (GeoJSON-Feeds)
- **Filterung:** Nur relevante Einträge (Baustellen + Sperren, kein LKW-Filter)
- **„Nur Sperren anzeigen"**-Toggle
- **Klick auf Marker** → Detailpopup mit Titel, Beschreibung, Zeitraum, ÖAMTC-Link
- **Listenansicht** je Bundesland mit sortierbarer Tabelle und Kartennavigation
- **Einstellungen** werden im localStorage gespeichert
- **Automatische Aktualisierung** bei Kartenverschiebung und WME-Refresh
- Vollständig basierend auf dem offiziellen **WME SDK** (keine OpenLayers / WazeWrap / jQuery Abhängigkeiten)

---

## Installation

1. [Tampermonkey](https://www.tampermonkey.net/) im Browser installieren
2. Das Skript installieren über: [WME_Traffic_Info_Service.user.js](WME_Traffic_Info_Service.user.js)  
   *(oder direkt über Greasy Fork / GitHub Releases)*
3. WME öffnen → Tab **„TIS"** in der linken Seitenleiste erscheint automatisch

---

## Verwendung

| Aktion | Beschreibung |
|--------|-------------|
| ☑ Checkbox Bundesland | Layer für dieses Bundesland ein-/ausschalten und Daten laden |
| ☰ Listen-Symbol | Komplette Meldungsliste des Bundeslandes als Tabelle öffnen |
| ⏻ Power-Button | Alle TIS-Layer global ein-/ausschalten |
| Klick auf Marker | Detailpopup mit vollständiger Meldungsinformation |
| Spaltenkopf in Liste | Tabelle nach dieser Spalte sortieren |
| ⟶ in Liste | Karte zu dieser Meldung navigieren |

---

## Entwicklung

### Voraussetzungen

- [Node.js](https://nodejs.org) (oder Dev Container – empfohlen)
- Tampermonkey mit aktiviertem „Allow access to file URLs" ([Anleitung](https://www.tampermonkey.net/faq.php?locale=en#Q204))

### Setup

```bash
git clone https://github.com/gk1220/wme-traffic-info-service.git
cd wme-traffic-info-service
npm install --no-package-lock
```

### Entwicklungsmodus (Hot Reload)

1. `header-dev.js` in Tampermonkey einfügen (einmalig)
2. Pfad in `header-dev.js` auf die lokale `.out/main.user.js` anpassen

```bash
npm run watch
```

### Release bauen

```bash
npm run build
```

Erstellt:
- `WME_Traffic_Info_Service.user.js` – installierbares Userscript
- `releases/release-<version>.user.js` – versioniertes Release-Archiv

### Neue Version veröffentlichen

Versionsnummer in `package.json` aktualisieren (Format: `YYYY.MM.DD.NN`), dann:

```bash
npm run release
```

---

## Projektstruktur

```
src/
  core/
    types.ts              – TypeScript Interfaces (Advisory, Settings, …)
    settings.ts           – localStorage Einstellungen
  data/
    stateConfig.ts        – Bundesland-Konfiguration + API URLs
    api.ts                – GM_xmlhttpRequest als Promise
    store.ts              – In-Memory Advisory Store
  logic/
    advisoryProcessor.ts  – GeoJSON → Advisory[] Parsing + Filterung
  map/
    layerManager.ts       – WME SDK Feature Layer Verwaltung
  ui/
    styles.ts             – CSS Styles (inline injiziert)
    tab.ts                – Sidebar Tab (sdk.Sidebar.registerScriptTab)
    popup.ts              – Marker-Popup + Report-Modal
  main.user.ts            – Einstiegspunkt + SDK Bootstrap + Events
```

---

## Technische Details

- **TypeScript** mit WME SDK Typings
- **Rollup** als Bundler (IIFE Output)
- **WME SDK Events:** `wme-map-move-end`, `wme-map-data-loaded`, `wme-layer-feature-clicked`
- **Kein externes CSS-Framework**, kein jQuery, kein WazeWrap
- Marker werden nur innerhalb des aktuellen Kartenausschnitts gerendert (Viewport-Culling)

---

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE)


This project helps you **bootstrap a TypeScript-based WME script** using the WME SDK.

It provides a clean project setup with build scripts, type checking, and release automation — so you can focus on writing your script!

---

## Setup options

You can use this project in two ways:

- 🟡 **Option 1: using DevContainers (recommended)** — no need to install anything globally
- 🟡 **Option 2: manual local setup** — install Node.js and Rollup yourself

**Important:** You **MUST** enable "Allow access to file URLs" for Tampermonkey, as explained [here](https://www.tampermonkey.net/faq.php?locale=en#Q204). Without this, Tampermonkey cannot load your local files during development.

---

## Option 1: Using DevContainers (recommended)

If you are using [Visual Studio Code](https://code.visualstudio.com/) and the [DevContainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers):

1. Open this folder in VS Code
2. When prompted, **reopen in Dev Container** (or run: `Dev Containers: Reopen in Container`)
3. The container will automatically install all dependencies (`npm install`)
4. You can now run:

```bash
npm run watch
```

No need to install Node.js, npm or Rollup globally — everything is handled inside the container.

---

## Option 2: Manual local setup

If you prefer to run the project directly on your machine:

### Required once

* Install [npm](https://docs.npmjs.com/cli) and [Node.js](https://nodejs.org)
* Allow local file access for the Tampermonkey extension, as explained [here](https://www.tampermonkey.net/faq.php?locale=en#Q204)
* Install [Rollup](https://rollupjs.org) globally:

```bash
npm install --global rollup
```

(This tool bundles your script for use in Tampermonkey.)

* (Optional) Install Git to manage file versions

---

## Getting started

1. Download this repository (as a zip) or clone it via git:

```bash
git clone https://github.com/bedo2991/wme-typescript.git
```

2. Initialize your own git repo if needed:

```bash
git init
```

3. Update the details in:

* `header.js` and `header-dev.js` → update author, script name, etc.
* `main.user.ts` → set your script ID and name

4. Install dependencies:

```bash
npm install
```

---

## Coding

* Open the project in an IDE (e.g. [VS Code](https://code.visualstudio.com/))
* You will get type checking and autocomplete thanks to the WME SDK typings.
* The `.ts` file containing your script (`main.user.ts`) needs to be translated to javascript in order to be used by Tampermonkey.
* ⚠️ **Warning**: the content of the .out folder is generated, you should never edit anything in here.
* During development, run:

```bash
npm run watch
```

This will continuously compile `.ts` to `.js`.

When ready to release:

```bash
npm run release
```

---

## Prepare for a release

1. Update the version number in `package.json`
2. Run:

```bash
npm run release
```

A file will be created in the `releases/` folder with the version in its name.

---

## Scripts explained

You can see all available scripts in `package.json`:

* `compile`: compiles your script once — usually not needed manually
* `watch`: continuously compiles when code changes — use this when developing
* `concat`: combines your `header.js` with compiled `.out/main.user.js`
* `build`: compile + concat
* `release`: updates version in `header.js` and builds release file

---

## Switching between production and beta typings

1. Uninstall current typings:

```bash
npm uninstall wme-sdk-typings
```

2. Install desired version:

**Production:**

```bash
npm install --save-dev https://web-assets.waze.com/wme_sdk_docs/production/latest/wme-sdk-typings.tgz
```

**Beta:**

```bash
npm install --save-dev https://web-assets.waze.com/wme_sdk_docs/beta/latest/wme-sdk-typings.tgz
```

Full WME SDK typings documentation [here](https://web-assets.waze.com/wme_sdk_docs/production/latest/index.html#md:typescript-type-definitions).

---
