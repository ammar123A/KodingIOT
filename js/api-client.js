/**
 * KodingIoT API Client
 * Talks to Supabase (Auth + PostgreSQL).
 *
 * Drop-in replacement for the old PHP-based ApiClient.
 * Every public method keeps the same signature & return shape
 * so the rest of the app works without changes.
 */
class ApiClient {

    // ── Auth ──────────────────────────────────────────────

    static async register(username, email, password) {
        // 1. Create Supabase auth user
        const { data, error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });
        if (error) return { error: error.message };

        // 2. Insert row into public.users table
        const userId = data.user?.id;
        if (userId) {
            await _supabase.from('users').insert({
                id: userId,
                username,
                email,
                role: 'student'
            });
        }

        return { message: 'Pendaftaran berjaya!' };
    }

    static async login(username, password) {
        // Look up the email by username first
        const { data: rows } = await _supabase
            .from('users')
            .select('email, id, username, role')
            .eq('username', username)
            .limit(1);

        if (!rows || rows.length === 0) {
            return { error: 'Nama pengguna tidak dijumpai.' };
        }

        const userRow = rows[0];
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: userRow.email,
            password
        });
        if (error) return { error: error.message };

        const user = {
            id: userRow.id,
            username: userRow.username,
            email: userRow.email,
            role: userRow.role
        };
        localStorage.setItem('kodingiot_current_user', JSON.stringify(user));
        return { user };
    }

    static async logout() {
        await _supabase.auth.signOut();
        localStorage.removeItem('kodingiot_current_user');
        return { message: 'Logged out' };
    }

    static async me() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return { user: null };

        // Fetch profile from public.users
        const { data: rows } = await _supabase
            .from('users')
            .select('id, username, email, role')
            .eq('id', session.user.id)
            .limit(1);

        if (!rows || rows.length === 0) return { user: null };
        return { user: rows[0] };
    }

    // ── Projects ─────────────────────────────────────────

    static async saveProject(data) {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return { error: 'Unauthorized — please log in.' };

        const userId = session.user.id;

        // If `data.id` exists we UPDATE, otherwise INSERT
        if (data.id) {
            const { error } = await _supabase
                .from('projects')
                .update({
                    name:           data.name,
                    description:    data.description,
                    tags:           data.tags,
                    level:          data.level,
                    type:           data.type,
                    workspace_data: data.workspaceData,
                    code:           data.code,
                })
                .eq('id', data.id)
                .eq('user_id', userId);

            if (error) return { error: error.message };
            return { project_id: data.id };
        }

        // INSERT new project
        const { data: inserted, error } = await _supabase
            .from('projects')
            .insert({
                user_id:        userId,
                name:           data.name,
                description:    data.description  || '',
                tags:           data.tags          || ['iot'],
                level:          data.level         || 'mudah',
                type:           data.type          || 'iot',
                workspace_data: data.workspaceData || {},
                code:           data.code          || '',
            })
            .select('id')
            .single();

        if (error) return { error: error.message };
        return { project_id: inserted.id };
    }

    static async loadProjects(params = {}) {
        let query = _supabase
            .from('projects')
            .select('*, users!inner(username)')
            .order('updated_at', { ascending: false });

        if (params.mine) {
            const { data: { session } } = await _supabase.auth.getSession();
            if (session) query = query.eq('user_id', session.user.id);
        } else {
            query = query.eq('is_public', true);
        }

        const { data, error } = await query;
        if (error) return { error: error.message };

        // Flatten author from join
        const projects = (data || []).map(p => ({
            ...p,
            author: p.users?.username || '—',
        }));
        // Remove the nested users object
        projects.forEach(p => delete p.users);

        return { projects };
    }

    static async loadProject(id) {
        const { data, error } = await _supabase
            .from('projects')
            .select('*, users!inner(username)')
            .eq('id', id)
            .single();

        if (error) return { error: error.message };
        data.author = data.users?.username || '—';
        delete data.users;
        return { project: data };
    }

    static async deleteProject(id) {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return { error: 'Unauthorized' };

        const { error } = await _supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) return { error: error.message };
        return { message: 'Deleted' };
    }

    // ── Admin helpers ────────────────────────────────────

    static async listUsers() {
        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return { error: error.message };
        return { users: data };
    }

    static async toggleFeatured(projectId, featured) {
        const { error } = await _supabase
            .from('projects')
            .update({ is_featured: featured })
            .eq('id', projectId);

        if (error) return { error: error.message };
        return { message: 'Updated' };
    }

    static async adminDeleteProject(id) {
        const { error } = await _supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) return { error: error.message };
        return { message: 'Deleted' };
    }
}
