// WME Traffic Info Service - Advisory Store
// Central in-memory storage for fetched advisory data

import { Advisory } from '../core/types';

// featureId → Advisory for marker click lookups
const featureMap = new Map<string, Advisory>();

// stateAbv → Advisory[] for report modals and layer repopulation
const stateMap = new Map<string, Advisory[]>();

export const advisoryStore = {
    /** Store all advisories for a state, updating the feature lookup map */
    setStateAdvisories(stateAbv: string, advisories: Advisory[]): void {
        // Remove old entries for this state
        for (const [key, adv] of featureMap.entries()) {
            if (adv.stateAbv === stateAbv) featureMap.delete(key);
        }
        stateMap.set(stateAbv, advisories);
        for (const adv of advisories) {
            featureMap.set(adv.id, adv);
        }
    },

    /** Get all advisories for a state */
    getStateAdvisories(stateAbv: string): Advisory[] {
        return stateMap.get(stateAbv) ?? [];
    },

    /** Lookup a single advisory by its feature ID */
    getById(id: string): Advisory | undefined {
        return featureMap.get(id);
    },

    /** Remove all data for a state */
    clearState(stateAbv: string): void {
        const advisories = stateMap.get(stateAbv) ?? [];
        for (const adv of advisories) {
            featureMap.delete(adv.id);
        }
        stateMap.delete(stateAbv);
    },

    /** Clear everything */
    clearAll(): void {
        featureMap.clear();
        stateMap.clear();
    },
};
