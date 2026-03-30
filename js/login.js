document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    if (email === 'admin@example.com' && password === 'Admin@123') {
        localStorage.setItem('admin_logged_in', 'true');
        window.location.href = 'index.html';
    } else {
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
};

// Clear session if any
localStorage.removeItem('admin_logged_in');
