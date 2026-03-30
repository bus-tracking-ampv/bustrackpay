import { db, ref, get, set, remove, update } from './firebase-config.js';
import { loadMapsAPI } from './map-loader.js';

// DOM Elements
const routeTableBody = document.getElementById('route-table-body');
const routeModal = document.getElementById('route-modal');
const routeForm = document.getElementById('route-form');
const btnAddRoute = document.getElementById('btn-add-route');
const modalTitle = document.getElementById('modal-title');
const searchRoute = document.getElementById('search-route');
const stopsList = document.getElementById('stops-list');

// Map Objects
let modalMap;
let directionsService;
let directionsRenderer;
let markers = {
    source: null,
    dest: null,
    stops: []
};

// State
let routesData = {};
let currentStops = [];
let pickingMode = 'source'; // source, dest, stops
let latestEncodedPolyline = null;
let isCalculating = false;
let reselectingStopIndex = -1;
let isPickingStop = false;

// 1. Initialize Modal Map
function initModalMap() {
    if (typeof google === 'undefined') return;

    modalMap = new google.maps.Map(document.getElementById('modal-map'), {
        center: { lat: 16.8450, lng: 74.2987 }, // Default: Ashokrao Mane Polytechnic Vathar
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: modalMap,
        suppressMarkers: true, // We use our own markers for S, D, and numbers
        polylineOptions: {
            strokeColor: '#0F67FD',
            strokeOpacity: 0.8,
            strokeWeight: 6
        },
        draggable: false
    });

    // Removed directions_changed listener as it interferes with stop selection

    modalMap.addListener('click', (e) => {
        const lat = e.latLng.lat().toFixed(6);
        const lng = e.latLng.lng().toFixed(6);
        const coordStr = `${lat}, ${lng}`;

        if (pickingMode === 'source') {
            document.getElementById('source-coords').value = coordStr;
            setPickingMode('dest');
            updateMarkersAndRoute();
        } else if (pickingMode === 'dest') {
            document.getElementById('dest-coords').value = coordStr;
            setPickingMode('stops');
            updateMarkersAndRoute();
        } else if (pickingMode === 'stops') {
            if (reselectingStopIndex > -1) {
                updateStopLocation(reselectingStopIndex, lat, lng);
            } else if (isPickingStop) {
                addStop(lat, lng);
                isPickingStop = false;
                setPickingMode('stops');
            }
        }
    });
}

window.startPickingStop = () => {
    isPickingStop = true;
    reselectingStopIndex = -1;
    setPickingMode('stops');
};

window.cancelPickingStop = () => {
    isPickingStop = false;
    reselectingStopIndex = -1;
    setPickingMode('stops');
};

function updateStopLocation(index, lat, lng) {
    currentStops[index].lat = lat;
    currentStops[index].lng = lng;
    reselectingStopIndex = -1; // Reset after update
    setPickingMode('stops'); // Revert text
    renderStops();
    updateMarkersAndRoute();
}

window.reselectStop = (index) => {
    reselectingStopIndex = index;
    setPickingMode('stops');
};

window.setPickingMode = (mode) => {
    pickingMode = mode;
    const instruction = document.getElementById('instruction-text');
    const badge = document.getElementById('step-badge');
    const sBox = document.getElementById('source-box');
    const dBox = document.getElementById('dest-box');

    sBox.classList.remove('active');
    dBox.classList.remove('active');

    if (mode === 'source') {
        instruction.innerText = "Pick Source Point on Map";
        badge.innerText = "Step 1: Source";
        badge.className = "selection-badge badge-source";
        sBox.classList.add('active');
    } else if (mode === 'dest') {
        instruction.innerText = "Pick Destination Point on Map";
        badge.innerText = "Step 2: Destination";
        badge.className = "selection-badge badge-dest";
        dBox.classList.add('active');
    } else if (mode === 'stops') {
        const btnTrigger = document.getElementById('btn-trigger-picker');
        if (reselectingStopIndex > -1) {
            const stopName = `Stop ${reselectingStopIndex + 1}`;
            instruction.innerText = `Click Map to Reposition ${stopName}`;
            badge.innerText = `Reselecting ${stopName}`;
            if (btnTrigger) btnTrigger.parentElement.style.display = 'none'; // Hide add button while reselecting
        } else if (isPickingStop) {
            instruction.innerText = "Click Map to Mark New Stop Location";
            badge.innerText = "Picking Stop...";
            if (btnTrigger) {
                btnTrigger.innerHTML = '<i class="fas fa-times"></i> CANCEL PICKING';
                btnTrigger.onclick = cancelPickingStop;
                btnTrigger.className = "btn-primary";
                btnTrigger.style.background = "var(--accent-rose)";
            }
        } else {
            instruction.innerText = "Waypoints Mode (Click 'ADD' to mark a new stop)";
            badge.innerText = "Step 3: Stops";
            if (btnTrigger) {
                btnTrigger.parentElement.style.display = 'flex';
                btnTrigger.innerHTML = '<i class="fas fa-plus-circle"></i> ADD NEW STOP';
                btnTrigger.onclick = startPickingStop;
                btnTrigger.className = "btn-primary";
                btnTrigger.style.background = "var(--primary-color)";
            }
        }
        badge.className = "selection-badge badge-stops";
    }
};

function updateMarkersAndRoute() {
    if (!modalMap) return;

    // Clear old markers
    if (markers.source) markers.source.setMap(null);
    if (markers.dest) markers.dest.setMap(null);
    markers.stops.forEach(m => m.setMap(null));
    markers.stops = [];

    const sourceStr = document.getElementById('source-coords').value;
    const destStr = document.getElementById('dest-coords').value;

    let origin, destination;

    // Source Marker
    if (sourceStr && sourceStr.includes(',')) {
        const [lat, lng] = sourceStr.split(',').map(Number);
        origin = { lat, lng };
        markers.source = new google.maps.Marker({
            position: origin,
            map: modalMap,
            draggable: true,
            label: { text: "S", color: "white", fontWeight: "bold" },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#10B981",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
                scale: 12
            }
        });

        markers.source.addListener('dragend', (e) => {
            const lat = e.latLng.lat().toFixed(6);
            const lng = e.latLng.lng().toFixed(6);
            document.getElementById('source-coords').value = `${lat}, ${lng}`;
            updateMarkersAndRoute();
        });
    }

    // Destination Marker
    if (destStr && destStr.includes(',')) {
        const [lat, lng] = destStr.split(',').map(Number);
        destination = { lat, lng };
        markers.dest = new google.maps.Marker({
            position: destination,
            map: modalMap,
            draggable: true,
            label: { text: "D", color: "white", fontWeight: "bold" },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#F43F5E",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white",
                scale: 12
            }
        });

        markers.dest.addListener('dragend', (e) => {
            const lat = e.latLng.lat().toFixed(6);
            const lng = e.latLng.lng().toFixed(6);
            document.getElementById('dest-coords').value = `${lat}, ${lng}`;
            updateMarkersAndRoute();
        });
    }

    // Stop Markers
    currentStops.forEach((stop, index) => {
        const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
        const m = new google.maps.Marker({
            position: pos,
            map: modalMap,
            draggable: true,
            label: { text: (index + 1).toString(), color: "white", fontSize: "10px" },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#0F67FD",
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "white",
                scale: 10
            }
        });

        m.addListener('dragend', (e) => {
            const lat = e.latLng.lat().toFixed(6);
            const lng = e.latLng.lng().toFixed(6);
            currentStops[index].lat = lat;
            currentStops[index].lng = lng;
            renderStops();
            updateMarkersAndRoute();
        });
        markers.stops.push(m);
    });

    // Calculate Road-Following Route
    if (origin && destination) {
        isCalculating = true;
        const btnSave = document.querySelector('button[type="submit"]');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerText = "CALCULATING ROUTE...";
        }

        const waypoints = currentStops.map(s => ({
            location: new google.maps.LatLng(s.lat, s.lng),
            stopover: true
        }));

        directionsService.route({
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false // Keep the order defined by admin
        }, (result, status) => {
            isCalculating = false;
            const btnSave = document.querySelector('button[type="submit"]');
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = "SAVE SYSTEM CONFIG";
            }

            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
                latestEncodedPolyline = result.routes[0].overview_polyline;
            } else {
                console.error("Directions request failed: " + status);
                latestEncodedPolyline = ""; // Reset if failed
                if (status === "ZERO_RESULTS") {
                    alert("No road route found between these points. Please adjust them.");
                } else if (status === "REQUEST_DENIED") {
                    alert("CRITICAL: Directions API is not enabled in your Google Cloud Console. \n\nPlease go to: https://console.cloud.google.com/google/maps-apis/api/directions-backend.googleapis.com/overview and click ENABLE.");
                    window.open("https://console.cloud.google.com/google/maps-apis/api/directions-backend.googleapis.com/overview", "_blank");
                } else {
                    console.error("Directions Error:", status);
                }
            }
        });
    } else {
        if (directionsRenderer) directionsRenderer.setDirections({ routes: [] }); // Clear route if not both set
    }
}

function addStop(lat, lng, name = "") {
    const stopId = Date.now();
    const stopObj = { id: stopId, lat, lng, name: name || `Stop ${currentStops.length + 1}` };
    currentStops.push(stopObj);
    renderStops();
    updateMarkersAndRoute();
}

function renderStops() {
    stopsList.innerHTML = '';
    currentStops.forEach((stop, index) => {
        const div = document.createElement('div');
        div.className = `stop-row ${reselectingStopIndex === index ? 'reselecting' : ''}`;
        div.style = 'margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr 40px 40px; gap: 10px; align-items: center;';
        div.innerHTML = `
            <input type="text" class="search-bar" style="width: 100%; font-size: 11px; padding: 8px;" placeholder="Stop Name" value="${stop.name}" onchange="updateStopName(${index}, this.value)">
            <input type="text" class="search-bar" style="width: 100%; font-size: 11px; padding: 8px;" placeholder="Lat, Lng" value="${stop.lat}, ${stop.lng}" readonly>
            <button type="button" onclick="reselectStop(${index})" class="coord-reset-btn" style="color: var(--primary-color);" title="Reselect Location"><i class="fas fa-map-marker-alt"></i></button>
            <button type="button" onclick="removeStop(${index})" style="background: none; border: none; color: var(--accent-rose); cursor: pointer;"><i class="fas fa-trash-alt"></i></button>
        `;
        stopsList.appendChild(div);
    });
}

window.updateStopName = (index, name) => {
    currentStops[index].name = name;
};

window.removeStop = (index) => {
    currentStops.splice(index, 1);
    renderStops();
    updateMarkersAndRoute();
};

// Error handler for Google Maps Activation issue
window.gm_authFailure = () => {
    const mapDiv = document.getElementById('modal-map');
    if (mapDiv) {
        mapDiv.style.background = '#fee2e2';
        mapDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #991b1b; font-size: 12px;">Google Maps API Activation Required</div>`;
    }
};

// 2. Load Google Maps and Initialize
loadMapsAPI().then(() => {
    initModalMap();
}).catch(err => {
    console.error(err);
    window.gm_authFailure();
});

// 3. Fetch Routes
get(ref(db, 'routes')).then((snapshot) => {
    routesData = snapshot.val() || {};
    renderRoutes(routesData);

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
});

function renderRoutes(data) {
    routeTableBody.innerHTML = '';
    Object.entries(data).forEach(([key, route]) => {
        const stopsCount = route.stops ? route.stops.length : 0;
        const row = `
            <tr class="fade-in">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="brand-icon" style="width: 32px; height: 32px; font-size: 14px;"><i class="fas fa-route"></i></div>
                        <span>${route.name}</span>
                    </div>
                </td>
                <td><span style="color: var(--primary-color); font-weight: 600;">BUS-${route.busNo}</span></td>
                <td>${stopsCount} Waypoints</td>
                <td><span style="color: var(--text-secondary);">Active Fleet</span></td>
                <td>
                    <div style="display: flex; gap: 10px;">
                        <button class="nav-link" style="padding: 8px; height: auto;" onclick="editRoute('${key}')">
                            <i class="fas fa-edit" style="font-size: 14px;"></i>
                        </button>
                        <button class="nav-link" style="padding: 8px; height: auto; color: var(--accent-rose);" onclick="deleteRoute('${key}')">
                            <i class="fas fa-trash" style="font-size: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        routeTableBody.innerHTML += row;
    });
}

// 4. Search
searchRoute.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = Object.fromEntries(
        Object.entries(routesData).filter(([_, r]) =>
            r.name.toLowerCase().includes(term)
        )
    );
    renderRoutes(filtered);
});

// 5. Add/Edit
btnAddRoute.onclick = () => {
    modalTitle.innerText = "Provision Fleet Route";
    routeForm.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('source-coords').value = "";
    document.getElementById('dest-coords').value = "";
    currentStops = [];
    latestEncodedPolyline = null;
    isCalculating = false;
    isPickingStop = false;
    reselectingStopIndex = -1;
    setPickingMode('source');
    renderStops();
    updateMarkersAndRoute();
    routeModal.style.display = 'grid';

    // Explicitly center on Vathar for new routes
    if (modalMap) {
        modalMap.setCenter({ lat: 16.8450, lng: 74.2987 });
        modalMap.setZoom(15);
    }

    setTimeout(() => google.maps.event.trigger(modalMap, 'resize'), 300);
};

routeForm.onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const routeId = editId || `route-${Date.now()}`;

    const sCoords = document.getElementById('source-coords').value.split(',').map(s => s.trim());
    const dCoords = document.getElementById('dest-coords').value.split(',').map(s => s.trim());

    if (sCoords.length < 2 || dCoords.length < 2) {
        alert("Please set both Source and Destination points on the map.");
        return;
    }

    if (isCalculating) {
        alert("Please wait for the route to finish calculating.");
        return;
    }

    const routeObj = {
        name: document.getElementById('route-name').value,
        busNo: document.getElementById('route-bus').value,
        source: {
            name: "Origin",
            lat: Number(sCoords[0]),
            lng: Number(sCoords[1])
        },
        destination: {
            name: "Destination",
            lat: Number(dCoords[0]),
            lng: Number(dCoords[1])
        },
        stops: currentStops.map(s => ({ name: s.name, lat: Number(s.lat), lng: Number(s.lng) })),
        encodedPolyline: latestEncodedPolyline || "", // Use the pre-calculated one
        updatedAt: Date.now()
    };

    await set(ref(db, `routes/${routeId}`), routeObj);
    routeModal.style.display = 'none';
};

window.editRoute = (id) => {
    const r = routesData[id];
    if (!r) return;

    modalTitle.innerText = "Modify Operational Route";
    document.getElementById('edit-id').value = id;
    document.getElementById('route-name').value = r.name || "";
    document.getElementById('route-bus').value = r.busNo || "";

    if (r.source) {
        document.getElementById('source-coords').value = `${r.source.lat}, ${r.source.lng}`;
    }
    if (r.destination) {
        document.getElementById('dest-coords').value = `${r.destination.lat}, ${r.destination.lng}`;
    }

    currentStops = (r.stops || []).map((s, i) => ({ ...s, id: Date.now() + i }));
    latestEncodedPolyline = r.encodedPolyline || ""; // Load existing path
    isCalculating = false;
    isPickingStop = false;
    reselectingStopIndex = -1;

    setPickingMode('stops');
    renderStops();
    updateMarkersAndRoute();
    routeModal.style.display = 'grid';
    setTimeout(() => google.maps.event.trigger(modalMap, 'resize'), 300);
};

window.deleteRoute = async (id) => {
    if (confirm("Permanently decommission this route?")) {
        await remove(ref(db, `routes/${id}`));
    }
};
