// WME Traffic Info Service - GeoJSON API Client

export function fetchGeoJSON(url: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload: (response: Tampermonkey.Response<any>) => {
                try {
                    resolve(JSON.parse(response.responseText));
                } catch (e) {
                    reject(new Error(`[TIS] JSON parse error for ${url}: ${e}`));
                }
            },
            onerror: (err: Tampermonkey.ErrorResponse) => {
                reject(new Error(`[TIS] Network error for ${url}: ${err.status}`));
            },
            ontimeout: () => {
                reject(new Error(`[TIS] Timeout for ${url}`));
            },
        });
    });
}
