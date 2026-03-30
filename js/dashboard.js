import { db, ref, get } from './firebase-config.js';

// DOM Elements
const countDrivers = document.getElementById('count-drivers');
const countStudents = document.getElementById('count-students');
const countRoutes = document.getElementById('count-routes');
const countLive = document.getElementById('count-live');
const liveTableBody = document.getElementById('live-table-body');

// 1. Loader & Init
Promise.all([
    get(ref(db, 'drivers')),
    get(ref(db, 'students')),
    get(ref(db, 'routes')),
    get(ref(db, 'locations'))
]).then(([driversSnap, studentsSnap, routesSnap, locationsSnap]) => {
    // 1. Sync Driver Count
    let data = driversSnap.val();
    animateCounter(countDrivers, data ? Object.keys(data).length : 0);

    // 2. Sync Student Count
    data = studentsSnap.val();
    animateCounter(countStudents, data ? Object.keys(data).length : 0);

    // 3. Sync Route Count
    data = routesSnap.val();
    animateCounter(countRoutes, data ? Object.keys(data).length : 0);

    // 4. Sync Live Tracking Table
    const locations = locationsSnap.val();
    liveTableBody.innerHTML = '';

    if (!locations) {
        liveTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px;">No active bus transmissions found.</td></tr>';
        countLive.innerText = '0';
    } else {
        let activeCount = 0;
        const now = Date.now();

        Object.entries(locations).forEach(([driverId, data]) => {
            activeCount++;
            const lastSeen = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Unknown';
            const isOnline = (now - (data.timestamp || 0)) < 60000; // Active in last 1 minute

            const row = `
                <tr class="fade-in">
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="https://ui-avatars.com/api/?name=${data.name || 'Driver'}&background=random" style="width: 32px; border-radius: 8px;">
                            <span>${data.name || 'Driver ' + driverId}</span>
                        </div>
                    </td>
                    <td><span style="font-weight: 600; color: var(--primary-color);">BUS-${data.busNo || 'N/A'}</span></td>
                    <td>${lastSeen}</td>
                    <td>
                        <span class="status-pills ${isOnline ? 'status-active' : 'status-offline'}">
                            ${isOnline ? 'LIVE' : 'IDLE'}
                        </span>
                    </td>
                    <td>
                        <button class="nav-link" style="padding: 8px 12px; height: auto;" onclick="window.location.href='tracking.html?id=${driverId}'">
                            <i class="fas fa-location-arrow" style="font-size: 14px;"></i>
                        </button>
                    </td>
                </tr>
            `;
            liveTableBody.innerHTML += row;
        });

        animateCounter(countLive, activeCount);
    }

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
});

// Helper: Animate Counter
function animateCounter(element, target) {
    let current = parseInt(element.innerText) || 0;
    const step = Math.ceil(Math.abs(target - current) / 20) || 1;

    const interval = setInterval(() => {
        if (current < target) {
            current = Math.min(current + step, target);
        } else if (current > target) {
            current = Math.max(current - step, target);
        }

        element.innerText = current;

        if (current === target) clearInterval(interval);
    }, 30);
}
