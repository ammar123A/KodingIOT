/**
 * KodingIoT API Client
 * Talks to the PHP/PostgreSQL backend.
 */
class ApiClient {
    static BASE = 'api';

    // ── Auth ──

    static async register(username, email, password) {
        return this._post('user-auth.php', { action: 'register', username, email, password });
    }

    static async login(username, password) {
        const res = await this._post('user-auth.php', { action: 'login', username, password });
        if (res.user) {
            localStorage.setItem('kodingiot_current_user', JSON.stringify(res.user));
        }
        return res;
    }

    static async logout() {
        const res = await this._post('user-auth.php', { action: 'logout' });
        localStorage.removeItem('kodingiot_current_user');
        return res;
    }

    static async me() {
        return this._post('user-auth.php', { action: 'me' });
    }

    // ── Projects ──

    static async saveProject(data) {
        return this._post('save-project.php', data);
    }

    static async loadProjects(params = {}) {
        const qs = new URLSearchParams(params).toString();
        const url = `${this.BASE}/load-projects.php` + (qs ? `?${qs}` : '');
        const res = await fetch(url, { credentials: 'include' });
        return res.json();
    }

    static async loadProject(id) {
        const res = await fetch(`${this.BASE}/load-projects.php?id=${id}`, { credentials: 'include' });
        return res.json();
    }

    static async deleteProject(id) {
        return this._post('delete-project.php', { id });
    }

    // ── Internal ──

    static async _post(endpoint, body) {
        const res = await fetch(`${this.BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });
        return res.json();
    }
}
