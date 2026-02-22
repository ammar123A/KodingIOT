/**
 * Session Manager — Auto-logout after 10 minutes of idle time.
 *
 * Tracks user activity (mouse, keyboard, scroll, touch) and:
 *  1. Shows a warning popup 1 minute before timeout.
 *  2. Auto-logs out when timeout is reached.
 *  3. Pings the server periodically to keep the PHP session alive while active.
 */
class SessionManager {
    static TIMEOUT       = 10 * 60 * 1000;   // 10 minutes in ms
    static WARNING_AT    = 9 * 60 * 1000;     // show warning at 9 minutes
    static PING_INTERVAL = 4 * 60 * 1000;     // ping server every 4 minutes while active
    static STORAGE_KEY   = 'kodingiot_last_activity';

    constructor() {
        // Only activate if user is logged in
        this.active = !!localStorage.getItem('kodingiot_current_user');
        if (!this.active) return;

        this.lastActivity  = Date.now();
        this.warningShown  = false;
        this.warningModal  = null;

        this._saveActivity();
        this._createWarningModal();
        this._bindEvents();
        this._startTimers();

        console.log('🔒 Session Manager aktif — auto logout selepas 10 minit idle.');
    }

    // ── Activity tracking ──────────────────────────────────

    _bindEvents() {
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        // Throttle: update at most once per second
        this._throttled = this._throttle(() => this._onActivity(), 1000);
        events.forEach(evt => document.addEventListener(evt, this._throttled, { passive: true }));

        // Sync across tabs via storage event
        window.addEventListener('storage', (e) => {
            if (e.key === SessionManager.STORAGE_KEY && e.newValue) {
                this.lastActivity = parseInt(e.newValue, 10);
                this.warningShown = false;
                this._hideWarning();
            }
        });
    }

    _onActivity() {
        this.lastActivity = Date.now();
        this._saveActivity();

        // Dismiss warning if user becomes active again
        if (this.warningShown) {
            this.warningShown = false;
            this._hideWarning();
        }
    }

    _saveActivity() {
        localStorage.setItem(SessionManager.STORAGE_KEY, String(this.lastActivity));
    }

    // ── Timers ─────────────────────────────────────────────

    _startTimers() {
        // Check idle every 10 seconds
        this._checkInterval = setInterval(() => this._checkIdle(), 10_000);

        // Ping server to keep PHP session alive while user is active
        this._pingInterval = setInterval(() => this._pingServer(), SessionManager.PING_INTERVAL);
    }

    _checkIdle() {
        const idle = Date.now() - this.lastActivity;

        if (idle >= SessionManager.TIMEOUT) {
            this._autoLogout();
            return;
        }

        if (idle >= SessionManager.WARNING_AT && !this.warningShown) {
            this._showWarning();
        }
    }

    async _pingServer() {
        // Only ping if user has been active recently (within last 5 min)
        const idle = Date.now() - this.lastActivity;
        if (idle > 5 * 60 * 1000) return;

        try {
            // Refresh Supabase session token if still active
            await _supabase.auth.getSession();
        } catch {
            // server unreachable — ignore
        }
    }

    // ── Warning modal ──────────────────────────────────────

    _createWarningModal() {
        const overlay = document.createElement('div');
        overlay.id = 'sessionWarningOverlay';
        overlay.innerHTML = `
            <div class="session-warning-box">
                <div class="session-warning-icon">⏳</div>
                <h3>Sesi Akan Tamat!</h3>
                <p>Anda tidak aktif untuk seketika. Sesi anda akan tamat dalam
                   <strong id="sessionCountdown">60</strong> saat.</p>
                <button id="sessionKeepAlive" class="session-btn-keep">✅ Teruskan Sesi</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.warningModal = overlay;

        document.getElementById('sessionKeepAlive').addEventListener('click', () => {
            this._onActivity();
        });
    }

    _showWarning() {
        this.warningShown = true;
        this.warningModal.classList.add('visible');
        this._startCountdown();
    }

    _hideWarning() {
        this.warningModal.classList.remove('visible');
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
    }

    _startCountdown() {
        const el = document.getElementById('sessionCountdown');
        if (this._countdownTimer) clearInterval(this._countdownTimer);

        this._countdownTimer = setInterval(() => {
            const remaining = Math.max(0, Math.ceil(
                (SessionManager.TIMEOUT - (Date.now() - this.lastActivity)) / 1000
            ));
            el.textContent = remaining;

            if (remaining <= 0) {
                clearInterval(this._countdownTimer);
                this._autoLogout();
            }
        }, 1000);
    }

    // ── Logout ─────────────────────────────────────────────

    async _autoLogout() {
        // Clean up timers
        clearInterval(this._checkInterval);
        clearInterval(this._pingInterval);
        if (this._countdownTimer) clearInterval(this._countdownTimer);

        // Remove local data
        localStorage.removeItem('kodingiot_current_user');
        localStorage.removeItem(SessionManager.STORAGE_KEY);

        // Tell Supabase to sign out
        try {
            await _supabase.auth.signOut();
        } catch {
            // ignore — we're logging out anyway
        }

        // Redirect to login with message
        window.location.href = 'login.html?expired=1';
    }

    // ── Helpers ─────────────────────────────────────────────

    _throttle(fn, wait) {
        let last = 0;
        return function (...args) {
            const now = Date.now();
            if (now - last >= wait) {
                last = now;
                fn.apply(this, args);
            }
        };
    }
}

// ── Initialize on every page ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager = new SessionManager();
});
