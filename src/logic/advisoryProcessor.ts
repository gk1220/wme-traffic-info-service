// WME Traffic Info Service - Advisory Processor
// Parses raw GeoJSON FeatureCollection into typed Advisory objects

import { Advisory } from '../core/types';

const START_TIME_RE = /(vom|von) \d{2}\.\d{2}\.\d{4}( \d{2}:\d{2}( Uhr)?)?/g;
const END_TIME_RE   = /(bis )\d{2}\.\d{2}\.\d{4}( \d{2}:\d{2}( Uhr)?)?/g;

const LKW_FILTER = 'für LKW über';
const VALID_TYPES = new Set(['Baustelle', 'Sperre']);

function classifyIconType(type: string, desc: string): 'roadwork' | 'closure' {
    // Description-based overrides have highest priority
    if (desc.includes('Fahrstreifen gesperrt') || desc.includes('Standstreifen gesperrt')) {
        return 'roadwork';
    }
    if (desc.includes('gesperrt')) {
        return 'closure';
    }
    return type === 'Baustelle' ? 'roadwork' : 'closure';
}

export function processGeoJSON(
    geojson: any,
    stateAbv: string,
    stateName: string
): Advisory[] {
    if (!geojson?.features || !Array.isArray(geojson.features)) {
        console.warn(`[TIS] No features in GeoJSON for ${stateAbv}`);
        return [];
    }

    const advisories: Advisory[] = [];

    for (const feature of geojson.features) {
        if (!feature?.geometry) continue;

        const props = feature.properties ?? {};
        const type: string = props.category ?? '';
        const desc: string = props.description ?? '';

        // Apply filters
        if (desc.includes(LKW_FILTER)) continue;
        if (!VALID_TYPES.has(type)) continue;

        // Extract representative coordinates
        let lon: number;
        let lat: number;
        const geomType: string = feature.geometry.type;

        if (geomType === 'Point') {
            [lon, lat] = feature.geometry.coordinates as [number, number];
        } else if (geomType === 'LineString') {
            [lon, lat] = (feature.geometry.coordinates as [number, number][])[0];
        } else {
            // Skip unsupported geometry types (Polygon, MultiLineString, etc.)
            continue;
        }

        if (!isFinite(lon) || !isFinite(lat)) continue;

        const iconType = classifyIconType(type, desc);
        const startMatch = desc.match(START_TIME_RE);
        const endMatch   = desc.match(END_TIME_RE);

        // Build a stable, unique ID
        const guid: string = props.guid ?? `${lon}_${lat}`;
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
