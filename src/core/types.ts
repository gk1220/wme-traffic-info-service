// WME Traffic Info Service - Types

export interface Advisory {
    id: string;
    stateAbv: string;
    stateName: string;
    title: string;
    lon: number;
    lat: number;
    type: string;
    iconType: 'roadwork' | 'closure';
    desc: string;
    time: Date;
    startTime: string | null;
    plannedEndTime: string | null;
    link: string;
    recurrence: string | null;
}

export interface StateInfo {
    abv: string;
    name: string;
    url: string;
}

export interface TISSettings {
    enabled: boolean;
    closuresOnly: boolean;
    [stateKey: string]: boolean; // e.g. BUTISEnabled, KATISEnabled, ...
}
