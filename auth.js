/* ═══════════════════════════════════════════════════════════════════════════
   DROPELITE — AUTH LAYER (auth.js)  ·  LIVE / SUPABASE VERSION
   ───────────────────────────────────────────────────────────────────────────
   Real authentication via Supabase. Users sign up / sign in with email +
   password. Sessions persist across devices and browser restarts.

   Depends on: api.js (must load AFTER api.js in your HTML)
═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const Auth = {
    // ─── SIGN UP (new account) ───
    async signUp(email, password, name) {
      if (!window.API) return { ok: false, error: 'API not loaded' };
      const result = await window.API.signUp(email, password, name);
      return result;
    },

    // ─── SIGN IN ───
    async login(email, password) {
      if (!window.API) return { ok: false, error: 'API not loaded' };

      const result = await window.API.signIn(email, password);
      if (!result.ok) {
        return { ok: false, error: result.error || 'Login failed' };
      }

      // Fetch the profile to know the user's role (user vs admin)
      const profile = await window.API.getProfile();
      const session = {
        id:    result.user.id,
        email: result.user.email,
        name:  profile ? profile.name : result.user.email.split('@')[0],
        role:  profile ? profile.role : 'user'
      };

      // Cache a lightweight copy for quick UI access (Supabase keeps the real session)
      try { localStorage.setItem('dropelite_user', JSON.stringify(session)); } catch (e) {}

      return { ok: true, user: session };
    },

    // ─── SIGN OUT ───
    async logout() {
      if (window.API) await window.API.signOut();
      try { localStorage.removeItem('dropelite_user'); } catch (e) {}
      location.href = 'login.html';
    },

    // ─── CURRENT USER (from cache — fast, for UI) ───
    currentUser() {
      try { return JSON.parse(localStorage.getItem('dropelite_user') || 'null'); }
      catch (e) { return null; }
    },

    // ─── CURRENT USER (from Supabase — accurate, async) ───
    async currentUserLive() {
      if (!window.API) return null;
      const user = await window.API.getCurrentUser();
      if (!user) return null;
      const profile = await window.API.getProfile();
      return {
        id:    user.id,
        email: user.email,
        name:  profile ? profile.name : user.email.split('@')[0],
        role:  profile ? profile.role : 'user'
      };
    },

    // ─── IS LOGGED IN (checks real Supabase session) ───
    async isLoggedIn() {
      if (!window.API) return false;
      const user = await window.API.getCurrentUser();
      return user !== null;
    },

    // ─── IS ADMIN ───
    async isAdmin() {
      const u = await this.currentUserLive();
      return !!(u && u.role === 'admin');
    },

    // ─── ROUTE GUARD — call at top of protected pages ───
    // requireRole: 'user' (any signed-in) or 'admin' (admin only)
    // Returns a Promise<boolean>. Redirects if not allowed.
    async guard(requireRole) {
      requireRole = requireRole || 'user';

      const user = await this.currentUserLive();
      if (!user) {
        location.href = 'login.html';
        return false;
      }

      // Refresh the cache with accurate data
      try { localStorage.setItem('dropelite_user', JSON.stringify(user)); } catch (e) {}

      if (requireRole === 'admin' && user.role !== 'admin') {
        alert('Admin access required.');
        location.href = 'dashboard.html';
        return false;
      }

      return true;
    }
  };

  window.Auth = Auth;
})();
