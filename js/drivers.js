import { db, ref, get, set, remove, update } from './firebase-config.js';

// DOM Elements
const driverTableBody = document.getElementById('driver-table-body');
const driverModal = document.getElementById('driver-modal');
const driverForm = document.getElementById('driver-form');
const btnAddDriver = document.getElementById('btn-add-driver');
const modalTitle = document.getElementById('modal-title');
const searchDriver = document.getElementById('search-driver');

// State
let driversData = {};

// 1. Fetch and Display Drivers
get(ref(db, 'drivers')).then((snapshot) => {
    driversData = snapshot.val() || {};
    renderDrivers(driversData);

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
});

function renderDrivers(data) {
    driverTableBody.innerHTML = '';
    Object.entries(data).forEach(([key, driver]) => {
        const row = `
            <tr class="fade-in">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://ui-avatars.com/api/?name=${driver.name}&background=random" style="width: 32px; border-radius: 8px;">
                        <span>${driver.name}</span>
                    </div>
                </td>
                <td>${driver.driverId}</td>
                <td>${driver.licenseNo}</td>
                <td><span style="color: var(--primary-color); font-weight: 600;">BUS-${driver.busNo}</span></td>
                <td>${driver.phone || '+91 98765 43210'}</td>
                <td><span class="status-pills status-active">VERIFIED</span></td>
                <td>
                    <div style="display: flex; gap: 10px;">
                        <button class="nav-link" style="padding: 8px; height: auto;" onclick="editDriver('${key}')">
                            <i class="fas fa-edit" style="font-size: 14px;"></i>
                        </button>
                        <button class="nav-link" style="padding: 8px; height: auto; color: var(--accent-rose);" onclick="deleteDriver('${key}')">
                            <i class="fas fa-trash" style="font-size: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        driverTableBody.innerHTML += row;
    });
}

// 2. Search Functionality
searchDriver.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = Object.fromEntries(
        Object.entries(driversData).filter(([_, d]) =>
            d.name.toLowerCase().includes(term) || d.driverId.toLowerCase().includes(term)
        )
    );
    renderDrivers(filtered);
});

// 3. Add/Edit Logic
btnAddDriver.onclick = () => {
    modalTitle.innerText = "Add New Driver";
    driverForm.reset();
    document.getElementById('edit-id').value = "";
    driverModal.style.display = 'grid';
};

driverForm.onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const driverId = document.getElementById('driver-id').value;

    const driverObj = {
        name: document.getElementById('driver-name').value,
        driverId: driverId,
        password: document.getElementById('driver-pass').value,
        licenseNo: document.getElementById('driver-license').value,
        busNo: document.getElementById('driver-bus').value,
        updatedAt: Date.now()
    };

    const targetRef = editId ? ref(db, `drivers/${editId}`) : ref(db, `drivers/${driverId}`);

    await set(targetRef, driverObj);
    driverModal.style.display = 'none';
};

// Global Exposure for inline onclicks
window.editDriver = (id) => {
    const d = driversData[id];
    modalTitle.innerText = "Edit Driver Details";
    document.getElementById('edit-id').value = id;
    document.getElementById('driver-name').value = d.name;
    document.getElementById('driver-id').value = d.driverId;
    document.getElementById('driver-pass').value = d.password;
    document.getElementById('driver-license').value = d.licenseNo;
    document.getElementById('driver-bus').value = d.busNo;
    driverModal.style.display = 'grid';
};

window.deleteDriver = async (id) => {
    if (confirm("Are you sure you want to remove this driver permanently?")) {
        await remove(ref(db, `drivers/${id}`));
    }
};
