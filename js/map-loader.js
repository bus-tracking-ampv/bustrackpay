import { CONFIG } from './config.js';

/**
 * Dynamically loads the Google Maps JavaScript API.
 * This ensures the API key is managed in one central place (config.js).
 */
export function loadMapsAPI() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve(window.google.maps);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log("Google Maps API script loaded successfully.");
            if (window.google && window.google.maps) {
                resolve(window.google.maps);
            } else {
                const err = new Error("Google Maps script loaded but 'google.maps' is undefined.");
                console.error(err);
                reject(err);
            }
        };

        script.onerror = (e) => {
            const err = new Error("Failed to load Google Maps JavaScript API. This could be due to an invalid API key, network issues, or API restrictions (Referrer).");
            console.error(err, e);
            reject(err);
        };

        document.head.appendChild(script);
    });
}
