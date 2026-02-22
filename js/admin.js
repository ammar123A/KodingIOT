// Admin Panel Controller
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            const res = await ApiClient.me();
            if (!res.user || res.user.role !== 'admin') {
                document.getElementById('accessDenied').style.display = '';
                document.getElementById('adminContent').style.display = 'none';
                return;
            }

            this.currentUser = res.user;
            document.getElementById('accessDenied').style.display = 'none';
            document.getElementById('adminContent').style.display = '';

            this.setupEventListeners();
            await this.loadDashboard();
        } catch (err) {
            console.error('Admin init error:', err);
        }
    }

    setupEventListeners() {
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await ApiClient.logout();
            localStorage.removeItem('kodingiot_current_user');
            window.location.href = 'login.html';
        });
    }

    async loadDashboard() {
        await Promise.all([
            this.loadUsers(),
            this.loadProjects()
        ]);
    }

    async loadUsers() {
        try {
            const res = await fetch('api/user-auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'list_users' })
            });
            const data = await res.json();

            if (data.users) {
                document.getElementById('totalUsers').textContent = data.users.length;
                const tbody = document.getElementById('usersTableBody');
                tbody.innerHTML = data.users.map(u => {
                    const badgeClass = u.role === 'admin' ? 'badge-admin' :
                                       u.role === 'teacher' ? 'badge-teacher' : 'badge-student';
                    const date = new Date(u.created_at).toLocaleDateString('ms-MY');
                    return `<tr>
                        <td>${u.id}</td>
                        <td>${u.username}</td>
                        <td>${u.email}</td>
                        <td><span class="badge ${badgeClass}">${u.role}</span></td>
                        <td>${date}</td>
                    </tr>`;
                }).join('');
            }
        } catch (err) {
            console.error('Load users error:', err);
            document.getElementById('usersTableBody').innerHTML =
                '<tr><td colspan="5" style="text-align:center; color:#e53e3e;">Gagal memuatkan pengguna</td></tr>';
        }
    }

    async loadProjects() {
        try {
            const res = await ApiClient.loadProjects();
            const projects = res.projects || [];

            document.getElementById('totalProjects').textContent = projects.length;
            document.getElementById('featuredProjects').textContent =
                projects.filter(p => p.is_featured).length;

            const tbody = document.getElementById('projectsTableBody');
            if (projects.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#a0aec0;">Tiada projek</td></tr>';
                return;
            }

            tbody.innerHTML = projects.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td>${p.author || '—'}</td>
                    <td>${p.type || 'iot'}</td>
                    <td>${p.is_featured ? '⭐' : '—'}</td>
                    <td>
                        <button class="btn-feature" onclick="adminPanel.toggleFeatured(${p.id}, ${!p.is_featured})">
                            ${p.is_featured ? 'Nyahunggulan' : '⭐ Unggulan'}
                        </button>
                        <button class="btn-danger" onclick="adminPanel.deleteProject(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
                            🗑️ Padam
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Load projects error:', err);
            document.getElementById('projectsTableBody').innerHTML =
                '<tr><td colspan="6" style="text-align:center; color:#e53e3e;">Gagal memuatkan projek</td></tr>';
        }
    }

    async toggleFeatured(projectId, featured) {
        try {
            const res = await fetch('api/save-project.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'toggle_featured', id: projectId, is_featured: featured })
            });
            const data = await res.json();
            if (data.error) {
                alert('❌ ' + data.error);
                return;
            }
            await this.loadProjects();
        } catch (err) {
            console.error('Toggle featured error:', err);
        }
    }

    async deleteProject(projectId, projectName) {
        if (!confirm(`Padam projek "${projectName}"?\nTindakan ini tidak boleh dibatalkan.`)) return;

        try {
            const res = await ApiClient.deleteProject(projectId);
            if (res.error) {
                alert('❌ ' + res.error);
                return;
            }
            await this.loadProjects();
        } catch (err) {
            console.error('Delete error:', err);
            alert('❌ Gagal memadam projek.');
        }
    }
}

// Initialize
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
