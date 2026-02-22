// Gallery Management System — backed by PostgreSQL via API
class ProjectGallery {
    static STORAGE = {
        CURRENT_PROJECT: 'kodingiot_current_project',
        CURRENT_USER: 'kodingiot_current_user'
    };

    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupEventListeners();
        this.renderGallery();
    }

    async loadProjects() {
        try {
            const res = await ApiClient.loadProjects();
            this.projects = (res.projects || []).map(p => ({
                ...p,
                // normalise field names from DB → frontend
                workspaceData: p.workspace_data || p.workspaceData,
                date: p.updated_at || p.created_at || p.date,
                isFeatured: !!p.is_featured,
            }));
        } catch (err) {
            console.error('Failed to load from API, falling back to localStorage', err);
            this.loadProjectsFromLocalStorage();
        }
        this.filterProjects();
    }

    /** Offline fallback */
    loadProjectsFromLocalStorage() {
        this.projects = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('kodingiot_project_')) {
                try {
                    const p = JSON.parse(localStorage.getItem(key));
                    if (p) this.projects.push(p);
                } catch { /* ignore */ }
            }
        }
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterProjects(e.target.value);
            this.renderGallery();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterProjects();
                this.renderGallery();
            });
        });

        // Login button — check session and toggle login/logout
        const loginBtn = document.getElementById('btn-login');
        if (loginBtn) {
            ApiClient.me().then(res => {
                if (res.user) {
                    localStorage.setItem('kodingiot_current_user', JSON.stringify(res.user));
                    loginBtn.textContent = '👤 ' + res.user.username;
                    loginBtn.style.background = '#48bb78';
                    loginBtn.onclick = async () => {
                        if (confirm('Log keluar daripada akaun ' + res.user.username + '?')) {
                            await ApiClient.logout();
                            localStorage.removeItem('kodingiot_current_user');
                            location.reload();
                        }
                    };
                } else {
                    loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
                }
            }).catch(() => {
                loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
            });
        }
    }

    filterProjects(searchTerm = '') {
        this.filteredProjects = this.projects.filter(project => {
            // Search filter
            const matchesSearch = !searchTerm || 
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            // Category filter
            const matchesFilter = this.currentFilter === 'all' || 
                project.tags.includes(this.currentFilter) ||
                project.type === this.currentFilter ||
                project.level === this.currentFilter;

            return matchesSearch && matchesFilter;
        });
    }

    renderGallery() {
        const featuredGrid = document.getElementById('featuredGrid');
        const projectsGrid = document.getElementById('projectsGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredProjects.length === 0) {
            featuredGrid.innerHTML = '';
            projectsGrid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Render featured projects
        const featuredProjects = this.filteredProjects.filter(p => p.isFeatured);
        featuredGrid.innerHTML = featuredProjects.map(project => this.createProjectCard(project)).join('');

        // Render all projects
        const regularProjects = this.filteredProjects.filter(p => !p.isFeatured);
        projectsGrid.innerHTML = regularProjects.map(project => this.createProjectCard(project)).join('');

        // Add click events to project cards
        this.addProjectCardEvents();
    }

    createProjectCard(project) {
        const date = new Date(project.date).toLocaleDateString('ms-MY');
        const tags = project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('');
        const levelBadge = project.level
            ? `<span class="project-tag" style="background:#bee3f8;">${project.level}</span> `
            : '';
        
        return `
            <div class="project-card" data-project-id="${project.id}">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h3 style="margin:0">${project.name}</h3>
                    <button class="btn-delete-project" data-project-id="${project.id}"
                        title="Padam projek"
                        style="background:none; border:none; cursor:pointer; font-size:1.2em;
                               padding:2px 6px; border-radius:5px; opacity:0.5; transition:opacity 0.2s;"
                        onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">🗑️</button>
                </div>
                <p>${project.description}</p>
                <div class="project-tags">
                    ${levelBadge}${tags}
                </div>
                <div class="project-meta">
                    <span class="project-author">👤 ${project.author}</span>
                    <span class="project-date">📅 ${date}</span>
                </div>
            </div>
        `;
    }

    addProjectCardEvents() {
        // Delete buttons
        document.querySelectorAll('.btn-delete-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                this.deleteProject(projectId);
            });
        });

        // Card click to open project
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const projectId = card.dataset.projectId;
                this.loadProject(projectId);
            });
        });
    }

    async deleteProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (!project) return;

        if (!confirm(`Padam projek "${project.name}"?\nTindakan ini tidak boleh dibatalkan.`)) return;

        try {
            const res = await ApiClient.deleteProject(projectId);
            if (res.error) {
                alert('❌ ' + res.error);
                return;
            }
            this.projects = this.projects.filter(p => p.id != projectId);
            this.filterProjects(document.getElementById('searchInput').value);
            this.renderGallery();
        } catch (err) {
            console.error('Delete error:', err);
            alert('❌ Gagal memadam projek.');
        }
    }

    loadProject(projectId) {
        const project = this.projects.find(p => p.id == projectId);
        if (project) {
            // Save project to temporary storage and redirect to editor
            localStorage.setItem(ProjectGallery.STORAGE.CURRENT_PROJECT, JSON.stringify(project));
            window.location.href = 'index.html';
        }
    }
}

// Initialize gallery when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.projectGallery = new ProjectGallery();
});