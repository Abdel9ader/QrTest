/**
 * auth.js — Login page authentication
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;

        if (errorDiv) errorDiv.classList.remove('visible');

        if (user === 'admin' && pass !== '') {
            // Show page loader then navigate
            const loader = document.getElementById('page-loader');
            if (loader) loader.classList.add('visible');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
        } else {
            if (errorDiv) errorDiv.classList.add('visible');
            // Shake the form for visual feedback
            loginForm.style.animation = 'none';
            requestAnimationFrame(() => {
                loginForm.style.animation = 'shake 0.4s ease';
            });
        }
    });
});
