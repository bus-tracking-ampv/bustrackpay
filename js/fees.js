import { db, ref, get, set, update } from './firebase-config.js';

const feesTableBody = document.getElementById('fees-table-body');
const approvedTableBody = document.getElementById('approved-table-body');

// Listen for Payment Requests
get(ref(db, 'paymentRequests')).then((snapshot) => {
    const data = snapshot.val() || {};
    renderRequests(data);

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
});

function renderRequests(data) {
    feesTableBody.innerHTML = '';
    approvedTableBody.innerHTML = '';

    const requests = Object.entries(data).reverse(); // Newest first

    if (requests.length === 0) {
        feesTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">No pending requests found</td></tr>';
        return;
    }

    requests.forEach(([key, req]) => {
        if (req.status === 'Pending') {
            const row = `
                <tr class="fade-in">
                    <td><strong>${req.studentName}</strong></td>
                    <td>${req.enrollmentId}</td>
                    <td><span class="status-pills status-active" style="background: #E0F2FE; color: #0369A1;">${req.semester}</span></td>
                    <td>₹${parseInt(req.amount).toLocaleString()}</td>
                    <td style="font-family: monospace; font-weight: bold;">${req.utr}</td>
                    <td><span class="status-pills status-offline">Pending</span></td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="nav-link" style="background: var(--accent-emerald); color: white; border: none; padding: 6px 12px; height: auto;" onclick="approvePayment('${key}')">Approve</button>
                            <button class="nav-link" style="background: var(--accent-rose); color: white; border: none; padding: 6px 12px; height: auto;" onclick="rejectPayment('${key}')">Reject</button>
                        </div>
                    </td>
                </tr>
            `;
            feesTableBody.innerHTML += row;
        } else {
            const date = new Date(req.timestamp).toLocaleDateString();
            const row = `
                <tr>
                    <td>${req.studentName}</td>
                    <td>${req.utr}</td>
                    <td>${date}</td>
                    <td><span class="status-pills ${req.status === 'Approved' ? 'status-active' : 'status-offline'}">${req.status}</span></td>
                </tr>
            `;
            approvedTableBody.innerHTML += row;
        }
    });
}

window.approvePayment = async (requestId) => {
    if (!confirm("Confirm UTR verification and approve payment?")) return;

    const requestRef = ref(db, `paymentRequests/${requestId}`);
    const snapshot = await get(requestRef);
    if (!snapshot.exists()) return;

    const req = snapshot.val();
    const enrollmentId = req.enrollmentId;

    // 1. Update Student Record
    const studentRef = ref(db, `students/${enrollmentId}`);
    const studentSnap = await get(studentRef);

    if (studentSnap.exists()) {
        const updates = {};
        if (req.semester === "Full Year") {
            updates.feeStatus = "Paid";
            updates.feeSem1 = "Paid";
            updates.feeSem2 = "Paid";
        } else if (req.semester === "Sem 1") {
            updates.feeSem1 = "Paid";
        } else if (req.semester === "Sem 2") {
            updates.feeSem2 = "Paid";
        }

        // If both semesters paid, mark overall as Paid
        const currentData = studentSnap.val();
        if ((updates.feeSem1 === "Paid" || currentData.feeSem1 === "Paid") &&
            (updates.feeSem2 === "Paid" || currentData.feeSem2 === "Paid")) {
            updates.feeStatus = "Paid";
        }

        updates.passStatus = "Valid";
        updates.busNo = req.busNo; // Confirm bus assignment
        await update(studentRef, updates);
    }

    // 2. Mark Request as Approved
    await update(requestRef, {
        status: 'Approved',
        processedAt: Date.now()
    });

    alert("Payment Approved Successfully");
};

window.rejectPayment = async (requestId) => {
    if (!confirm("Reject this payment request?")) return;
    await update(ref(db, `paymentRequests/${requestId}`), {
        status: 'Rejected',
        processedAt: Date.now()
    });
};
