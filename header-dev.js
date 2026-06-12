// ==UserScript==
// @name        WME Traffic Info Service
// @name:de     WME Traffic Info Service
// @namespace   https://github.com/gk1220
// @version     2026.06.12.01
// @description Overlays Austrian traffic advisories (Baustellen & Sperren) from the official TIS directly on the WME map
// @description:de Zeigt österreichische Verkehrsmeldungen (Baustellen & Sperren) aus dem TIS direkt auf der WME-Karte
// @author      Gerhard (g1220k)
// @homepageURL https://github.com/gk1220/wme-traffic-info-service
// @supportURL  https://github.com/gk1220/wme-traffic-info-service/issues
// @downloadURL https://update.greasyfork.org/scripts/582426/WME%20Traffic%20Info%20Service.user.js
// @updateURL https://update.greasyfork.org/scripts/582426/WME%20Traffic%20Info%20Service.meta.js
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

// @require       file:///home/gerhard.kronstorfer/Documents/Gerhard/Waze/Waze/WME_scripts/.out/main.user.js
// ==/UserScript==

// make sure that inside Tampermonkey's extension settings (on the browser, not from TM) and allow "Local file access", as shown here: https://www.tampermonkey.net/faq.php?locale=en#Q204
// make sure that the snippts inside header.js and header-dev.js are the same, except for the one @require field
// adjust the require field to the location of the .out/main.user.js file inside this directory
// copy the above snippet (up to ==/Userscript==) inside Tampermonkey's editor and save it
