import { db, ref, set, push, get, remove } from './firebase-config.js';

const notificationForm = document.getElementById('notification-form');
const notificationList = document.getElementById('notification-list');

// 1. Post Notification
notificationForm.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('alert-title').value;
    const target = document.getElementById('alert-target').value;
    const message = document.getElementById('alert-message').value;

    const newNotification = {
        title,
        target,
        message,
        timestamp: Date.now(),
        sender: "Administrator"
    };

    const newRef = push(ref(db, 'notifications'));
    await set(newRef, newNotification);

    notificationForm.reset();
    alert("Alert dispatched successfully!");
};

// 2. Load History
get(ref(db, 'notifications')).then((snapshot) => {
    const data = snapshot.val() || {};
    notificationList.innerHTML = '';

    // Hide global loader once data is ready
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');

    // Convert to array and sort by latest
    const sortedNotifications = Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);

    sortedNotifications.forEach(([id, alert]) => {
        const time = new Date(alert.timestamp).toLocaleString();
        const targetColor = alert.target === 'all' ? '#0F67FD' : (alert.target === 'drivers' ? '#FF9800' : '#F43F5E');

        const card = `
            <div class="stat-card" style="margin-bottom: 16px; border-left: 5px solid ${targetColor}; background: rgba(255,255,255,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 16px; font-weight: 700;">${alert.title}</h4>
                        <span style="font-size: 11px; color: ${targetColor}; font-weight: 600; text-transform: uppercase;">TO: ${alert.target}</span>
                    </div>
                    <button onclick="deleteNotification('${id}')" style="background: none; border: none; color: var(--accent-rose); cursor: pointer;"><i class="fas fa-trash-alt"></i></button>
                </div>
                <p style="margin: 12px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5;">${alert.message}</p>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                    <span><i class="fas fa-clock"></i> ${time}</span>
                    <span>Admin</span>
                </div>
            </div>
        `;
        notificationList.innerHTML += card;
    });
});

window.deleteNotification = async (id) => {
    if (confirm("Delete this broadcast record?")) {
        await remove(ref(db, `notifications/${id}`));
    }
};
