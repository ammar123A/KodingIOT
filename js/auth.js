// Authentication System — backed by PostgreSQL via API
class AuthSystem {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }

    async checkExistingSession() {
        try {
            const res = await ApiClient.me();
            if (res.user && window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        } catch {
            // API not reachable — fall through
        }
    }

    setupEventListeners() {
        // Switch between login and register
        document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToRegister();
        });

        document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToLogin();
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    switchToRegister() {
        document.getElementById('loginForm').parentElement.style.display = 'none';
        document.getElementById('registerCard').style.display = 'block';
        this.isLoginMode = false;
    }

    switchToLogin() {
        document.getElementById('registerCard').style.display = 'none';
        document.getElementById('loginForm').parentElement.style.display = 'block';
        this.isLoginMode = true;
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showMessage('Nama pengguna dan kata laluan wajib diisi.', 'error');
            return;
        }

        try {
            const res = await ApiClient.login(username, password);
            if (res.error) {
                this.showMessage(res.error, 'error');
                return;
            }
            this.showMessage('Log masuk berjaya! Mengalihkan...', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 800);
        } catch (err) {
            this.showMessage('Gagal menyambung ke pelayan.', 'error');
            console.error(err);
        }
    }

    async handleRegister() {
        const username        = document.getElementById('regUsername').value.trim();
        const email           = document.getElementById('regEmail').value.trim();
        const password        = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
            this.showMessage('Kata laluan dan pengesahan kata laluan tidak sama!', 'error');
            return;
        }
        if (password.length < 6) {
            this.showMessage('Kata laluan mesti sekurang-kurangnya 6 aksara!', 'error');
            return;
        }

        try {
            const res = await ApiClient.register(username, email, password);
            if (res.error) {
                this.showMessage(res.error, 'error');
                return;
            }
            this.showMessage('Pendaftaran berjaya! Sila log masuk.', 'success');
            this.switchToLogin();
        } catch (err) {
            this.showMessage('Gagal menyambung ke pelayan.', 'error');
            console.error(err);
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.auth-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message ${type}`;
        messageEl.textContent = message;

        // Insert message
        const currentForm = this.isLoginMode ? 
            document.getElementById('loginForm') : 
            document.getElementById('registerForm');
        currentForm.parentElement.insertBefore(messageEl, currentForm);
    }

    // Static methods for use in other files
    static getCurrentUser() {
        const userStr = localStorage.getItem('kodingiot_current_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static async logout() {
        await ApiClient.logout();
        localStorage.removeItem('kodingiot_current_user');
        window.location.href = 'login.html';
    }

    static isLoggedIn() {
        return !!localStorage.getItem('kodingiot_current_user');
    }
}

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});