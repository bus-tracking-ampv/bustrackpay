import { db, ref, get, set, remove, update } from './firebase-config.js';

// DOM Elements
const studentTableBody = document.getElementById('student-table-body');
const studentModal = document.getElementById('student-modal');
const studentForm = document.getElementById('student-form');
const btnAddStudent = document.getElementById('btn-add-student');
const modalTitle = document.getElementById('modal-title');
const searchStudent = document.getElementById('search-student');

// State
let studentsData = {};
let routesData = {};

// 1. Fetch Students & Routes
Promise.all([
    get(ref(db, 'students')),
    get(ref(db, 'routes'))
]).then(([studentsSnap, routesSnap]) => {
    studentsData = studentsSnap.val() || {};
    routesData = routesSnap.val() || {};
    renderStudents(studentsData);

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
});

function renderStudents(data) {
    studentTableBody.innerHTML = '';
    Object.entries(data).forEach(([key, student]) => {
        const sem1Paid = student.feeSem1 === 'Paid';
        const sem2Paid = student.feeSem2 === 'Paid';
        const isFeePaid = student.feeStatus === 'Paid';
        const isPassValid = student.passStatus === 'Valid';
        const pickup = student.pickupStop || 'Not Assigned';

        const row = `
            <tr class="fade-in">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://ui-avatars.com/api/?name=${student.name}&background=random" style="width: 32px; border-radius: 8px;">
                        <span>${student.name}</span>
                    </div>
                </td>
                <td>${student.enrollmentId}</td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: var(--primary-color); font-weight: 600;">BUS-${student.busNo}</span>
                        <span style="font-size: 11px; color: var(--text-secondary);"><i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i>${pickup}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <span class="status-pills ${sem1Paid ? 'status-active' : 'status-offline'}" title="Sem 1">S1</span>
                        <span class="status-pills ${sem2Paid ? 'status-active' : 'status-offline'}" title="Sem 2">S2</span>
                    </div>
                </td>
                <td><span class="status-pills ${isPassValid ? 'status-active' : 'status-offline'}">${student.passStatus}</span></td>
                <td>
                    <div style="display: flex; gap: 10px;">
                        <button class="nav-link" style="padding: 8px; height: auto;" onclick="editStudent('${key}')">
                            <i class="fas fa-edit" style="font-size: 14px;"></i>
                        </button>
                        <button class="nav-link" style="padding: 8px; height: auto; color: var(--accent-rose);" onclick="deleteStudent('${key}')">
                            <i class="fas fa-trash" style="font-size: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        studentTableBody.innerHTML += row;
    });
}

// 2. Dynamic Stop Population
const studentBusInput = document.getElementById('student-bus');
const pickupStopSelect = document.getElementById('student-pickup-stop');

studentBusInput.addEventListener('input', () => updateStopOptions(studentBusInput.value));

function updateStopOptions(busNo, selectedStop = "") {
    pickupStopSelect.innerHTML = '<option value="">-- Select Stop --</option>';

    // Find route for this bus
    const route = Object.values(routesData).find(r => r.busNo === busNo);
    if (!route) return;

    const stopsList = [];
    if (route.source) stopsList.push(route.source.name);
    if (route.stops) {
        Object.values(route.stops).forEach(s => stopsList.push(s.name));
    }
    // We don't add destination as student is coming TO college (destination)

    stopsList.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.text = stop;
        if (stop === selectedStop) option.selected = true;
        pickupStopSelect.appendChild(option);
    });
}

// 3. Search (Keep existing)
searchStudent.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = Object.fromEntries(
        Object.entries(studentsData).filter(([_, s]) =>
            s.name.toLowerCase().includes(term) || s.enrollmentId.toLowerCase().includes(term)
        )
    );
    renderStudents(filtered);
});

// 4. Add/Edit
btnAddStudent.onclick = () => {
    modalTitle.innerText = "Enroll New Student";
    studentForm.reset();
    pickupStopSelect.innerHTML = '<option value="">-- Select Stop --</option>';
    document.getElementById('edit-id').value = "";
    studentModal.style.display = 'grid';
};

studentForm.onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const enrollmentId = document.getElementById('student-id').value;

    const studentObj = {
        name: document.getElementById('student-name').value,
        enrollmentId: enrollmentId,
        email: document.getElementById('student-email').value,
        phone: document.getElementById('student-phone').value,
        password: document.getElementById('student-pass').value,
        busNo: document.getElementById('student-bus').value,
        pickupStop: pickupStopSelect.value,
        feeStatus: document.getElementById('student-fees').value,
        feeSem1: document.getElementById('student-fee-sem1').value,
        feeSem2: document.getElementById('student-fee-sem2').value,
        passStatus: document.getElementById('student-pass-status').value,
        updatedAt: Date.now()
    };

    const targetRef = editId ? ref(db, `students/${editId}`) : ref(db, `students/${enrollmentId}`);

    await set(targetRef, studentObj);
    studentModal.style.display = 'none';
};

window.editStudent = (id) => {
    const s = studentsData[id];
    modalTitle.innerText = "Edit Enrollment Details";
    document.getElementById('edit-id').value = id;
    document.getElementById('student-name').value = s.name;
    document.getElementById('student-id').value = s.enrollmentId;
    document.getElementById('student-email').value = s.email || "";
    document.getElementById('student-phone').value = s.phone || "";
    document.getElementById('student-pass').value = s.password || "password123";
    document.getElementById('student-bus').value = s.busNo;
    document.getElementById('student-fees').value = s.feeStatus || "Pending";
    document.getElementById('student-fee-sem1').value = s.feeSem1 || "Pending";
    document.getElementById('student-fee-sem2').value = s.feeSem2 || "Pending";
    document.getElementById('student-pass-status').value = s.passStatus || "Invalid";
    updateStopOptions(s.busNo, s.pickupStop);
    studentModal.style.display = 'grid';
};

window.deleteStudent = async (id) => {
    if (confirm("Are you sure you want to delete this enrollment?")) {
        await remove(ref(db, `students/${id}`));
    }
};
