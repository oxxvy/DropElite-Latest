/* ═══════════════════════════════════════════════════════════════════════════
   DROPELITE — AUTH LAYER (auth.js)
   ───────────────────────────────────────────────────────────────────────────
   Demo authentication using localStorage. NO PASSWORDS ARE SECURE in this
   mode — it's purely for showing/testing the dashboard before launch.

   DEMO CREDENTIALS:
   ─────────────────
   User login (dashboard.html):
     email: demo@dropelite.com   password: demo123
     email: rejaul@dropelite.com password: rejaul123

   Admin login (admin.html):
     email: admin@dropelite.com  password: admin123

   HOW TO SWAP IN SUPABASE AUTH LATER (Phase 4):
   ──────────────────────────────────────────────
   1. In login.html, replace Auth.login() body with supabase.auth.signInWithPassword()
   2. In this file, replace the DEMO_USERS array logic with Supabase session checks
   3. Set MODE = 'live' in api.js too
═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── DEMO USERS ───────────────────────────────────────────────────────────
  // Edit this list to add/remove demo accounts. In live mode, this is ignored.
  const DEMO_USERS = [
    { email: 'demo@dropelite.com',   password: 'demo123',   name: 'Demo User',   role: 'user'  },
    { email: 'rejaul@dropelite.com', password: 'rejaul123', name: 'Rejaul K',    role: 'user'  },
    { email: 'admin@dropelite.com',  password: 'admin123',  name: 'Admin',       role: 'admin' }
  ];

  const Auth = {
    // ─── LOGIN ──
    async login(email, password) {
      // Demo mode: check against DEMO_USERS
      const user = DEMO_USERS.find(u =>
        u.email.toLowerCase() === (email || '').toLowerCase().trim() &&
        u.password === password
      );
      if (!user) {
        return { ok: false, error: 'Wrong email or password.' };
      }
      // Generate a fake token (in live mode this comes from Supabase)
      const token = 'demo_' + btoa(user.email + ':' + Date.now()).replace(/=/g, '');
      const session = {
        email: user.email,
        name:  user.name,
        role:  user.role,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem('dropelite_token', token);
      localStorage.setItem('dropelite_user',  JSON.stringify(session));
      return { ok: true, user: session };
    },

    // ─── LOGOUT ──
    logout() {
      localStorage.removeItem('dropelite_token');
      localStorage.removeItem('dropelite_user');
      // Redirect to login page
      location.href = 'login.html';
    },

    // ─── CURRENT USER ──
    currentUser() {
      try { return JSON.parse(localStorage.getItem('dropelite_user') || 'null'); }
      catch(e) { return null; }
    },

    // ─── ROLE CHECK ──
    isAdmin() {
      const u = this.currentUser();
      return !!(u && u.role === 'admin');
    },

    isLoggedIn() {
      return !!localStorage.getItem('dropelite_token');
    },

    // ─── ROUTE GUARD — call at top of each page ──
    // requireRole: 'user' (any logged in) or 'admin' (admin only)
    guard(requireRole) {
      requireRole = requireRole || 'user';
      const user = this.currentUser();
      if (!user) { location.href = 'login.html'; return false; }
      if (requireRole === 'admin' && user.role !== 'admin') {
        alert('Admin access required. Logging you out.');
        this.logout();
        return false;
      }
      return true;
    }
  };

  window.Auth = Auth;
})();
