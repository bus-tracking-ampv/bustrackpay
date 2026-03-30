import { db, ref, onValue } from './firebase-config.js';
import { loadMapsAPI } from './map-loader.js';

let map;
let markers = {};
let routePolyline;
const fleetList = document.getElementById('fleet-list');
const urlParams = new URLSearchParams(window.location.search);
const focusId = urlParams.get('id');

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 16.8450, lng: 74.2987 }, // Ashokrao Mane Polytechnic Vathar
        zoom: 15,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
            { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
            { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
            { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
        ]
    });

    routePolyline = new google.maps.Polyline({
        strokeColor: '#0F67FD',
        strokeOpacity: 0.6,
        strokeWeight: 5,
        map: map
    });
}

// 1. Initialize Map
loadMapsAPI().then(() => {
    initMap();
}).catch(err => {
    console.error(err);
    window.gm_authFailure();
});

// Error handler for Google Maps Auth/Activation issues
window.gm_authFailure = () => {
    alert("Google Maps API Error: Please ensure you have enabled 'Maps JavaScript API' in your Google Cloud Console for the API key being used. The map cannot be initialized.");
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.style.background = '#fee2e2';
        mapDiv.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #991b1b;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="font-weight: 800;">API Activation Required</h3>
                <p>The system detected an 'ApiNotActivatedMapError'. Please enable the **Maps JavaScript API** in your Google Cloud Console.</p>
                <a href="https://console.cloud.google.com/" target="_blank" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #dc2626; color: white; border-radius: 12px; text-decoration: none; font-weight: 600;">Go to Console</a>
            </div>
        `;
    }
};

// 2. Track Fleet
let isFirstLoad = true;
onValue(ref(db, 'locations'), (snapshot) => {
    const locations = snapshot.val() || {};
    fleetList.innerHTML = '';

    if (isFirstLoad) {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.add('hidden');
        isFirstLoad = false;
    }

    Object.entries(locations).forEach(([driverId, data]) => {
        const pos = { lat: data.latitude, lng: data.longitude };

        // Update or Create Marker
        if (markers[driverId]) {
            markers[driverId].setPosition(pos);
        } else {
            markers[driverId] = new google.maps.Marker({
                position: pos,
                map: map,
                title: data.name || 'Bus ' + data.busNo,
                icon: {
                    url: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Fast choice for professional bus icon
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20)
                }
            });

            // Auto-focus if this was the clicked bus from dashboard
            if (focusId === driverId) {
                focusBus(driverId, data.latitude, data.longitude, data.busNo);
            }
        }

        // Add to Sidebar
        const busItem = document.createElement('div');
        busItem.className = `bus-item ${focusId === driverId ? 'active' : ''}`;
        busItem.onclick = () => focusBus(driverId, data.latitude, data.longitude, data.busNo);
        busItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700;">BUS-${data.busNo || 'N/A'}</span>
                <span style="font-size: 11px; color: var(--accent-emerald);">● LIVE</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 5px;">
                ${data.name || 'Driver ' + driverId}
            </div>
        `;
        fleetList.appendChild(busItem);
    });
});

window.focusBus = (id, lat, lng, busNo) => {
    map.panTo({ lat, lng });
    map.setZoom(16);

    // Fetch route for this bus to show polyline
    onValue(ref(db, 'routes'), (snapshot) => {
        const routes = snapshot.val() || {};
        const route = Object.values(routes).find(r => r.busNo === busNo);
        if (route) {
            if (route.encodedPolyline) {
                // Use detailed road-following path
                const path = google.maps.geometry.encoding.decodePath(route.encodedPolyline);
                routePolyline.setPath(path);
            } else {
                // Fallback to straight lines for legacy data
                const path = [
                    { lat: route.source.lat, lng: route.source.lng },
                    ...(route.stops || []).map(s => ({ lat: s.lat, lng: s.lng })),
                    { lat: route.destination.lat, lng: route.destination.lng }
                ];
                routePolyline.setPath(path);
            }
        }
    }, { onlyOnce: true });
};
