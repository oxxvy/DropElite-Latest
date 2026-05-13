/* ═══════════════════════════════════════════════════════════════════════════
   DROPELITE — API LAYER (api.js)
   ───────────────────────────────────────────────────────────────────────────
   This is the SINGLE PLACE where the dashboard talks to data.
   Right now it returns demo data from localStorage (works offline, no setup).
   When you're ready to launch with real data (Phase 4), only this file changes.

   HOW TO SWAP IN SUPABASE LATER:
   ───────────────────────────────
   1. Sign up at supabase.com (free tier is fine to start)
   2. Create tables: users, wallets, airdrops, missions, rewards, reports
   3. Get your Supabase URL + anon key from project settings
   4. Replace the MODE constant below from 'demo' to 'live'
   5. Fill in SUPABASE_URL and SUPABASE_KEY
   That's it. The dashboard doesn't need any other changes.
═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────────────────────
  const MODE = 'demo';                // 'demo' = localStorage | 'live' = Supabase
  const SUPABASE_URL = '';            // Fill in when going live
  const SUPABASE_KEY = '';            // Fill in when going live
  const API_VERSION = '1.0.0';

  // ─── LOW-LEVEL HELPERS ────────────────────────────────────────────────────
  function _delay(ms) { return new Promise(r => setTimeout(r, ms || 200)); }

  function _readStore(key, fallback) {
    try {
      const raw = localStorage.getItem('dropelite_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  }

  function _writeStore(key, value) {
    try {
      localStorage.setItem('dropelite_' + key, JSON.stringify(value));
      return true;
    } catch(e) { return false; }
  }

  // Supabase REST call helper (only used when MODE === 'live')
  async function _supabase(path, options) {
    options = options || {};
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + (localStorage.getItem('dropelite_token') || SUPABASE_KEY),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  }

  // ─── DEMO SEED DATA ───────────────────────────────────────────────────────
  // First-time load fills localStorage with sample data so the dashboard isn't empty.
  function _seedIfEmpty() {
    if (_readStore('seeded', false)) return;

    _writeStore('wallets', [
      { id: 1, label: 'Main Wallet',  address: '0x7a8f...3c2b', chain: 'Ethereum', balance: 2.45,  usd: 8240 },
      { id: 2, label: 'Farm Wallet',  address: '0x9d1e...8f4a', chain: 'Arbitrum', balance: 1.20,  usd: 4030 },
      { id: 3, label: 'L2 Wallet',    address: '0x4b2c...7e9d', chain: 'Base',     balance: 0.85,  usd: 2856 },
      { id: 4, label: 'Solana Hot',   address: 'Hx9f...Vb3K',   chain: 'Solana',   balance: 18.5,  usd: 3145 }
    ]);

    _writeStore('airdrops', [
      { id: 1, name: 'LayerZero',  chain: 'Ethereum', status: 'farming',  priority: 'high',   eligibility: 92, estValue: 4200 },
      { id: 2, name: 'zkSync',     chain: 'zkSync',   status: 'farming',  priority: 'high',   eligibility: 88, estValue: 3800 },
      { id: 3, name: 'Scroll',     chain: 'Scroll',   status: 'farming',  priority: 'medium', eligibility: 75, estValue: 1500 },
      { id: 4, name: 'Linea',      chain: 'Linea',    status: 'farming',  priority: 'medium', eligibility: 68, estValue: 1200 },
      { id: 5, name: 'Eclipse',    chain: 'Eclipse',  status: 'watching', priority: 'high',   eligibility: 0,  estValue: 0    },
      { id: 6, name: 'Monad',      chain: 'Monad',    status: 'farming',  priority: 'high',   eligibility: 84, estValue: 2900 }
    ]);

    _writeStore('missions', [
      { id: 1, title: 'Swap on LayerZero',   xp: 50,  done: false, project: 'LayerZero' },
      { id: 2, title: 'Bridge to zkSync',    xp: 75,  done: true,  project: 'zkSync'    },
      { id: 3, title: 'Provide liquidity',   xp: 100, done: false, project: 'Scroll'    },
      { id: 4, title: 'Daily check-in',      xp: 20,  done: false, project: 'Monad'     },
      { id: 5, title: 'Stake on Linea',      xp: 60,  done: false, project: 'Linea'     }
    ]);

    _writeStore('rewards', [
      { id: 1, project: 'Arbitrum',  amount: 1250, token: 'ARB',  usd: 1340, status: 'claimed',  date: '2025-03-22' },
      { id: 2, project: 'Jupiter',   amount: 420,  token: 'JUP',  usd: 380,  status: 'claimed',  date: '2025-04-15' },
      { id: 3, project: 'StarkNet',  amount: 1800, token: 'STRK', usd: 720,  status: 'pending',  date: '2025-05-01' }
    ]);

    _writeStore('stats', {
      totalUsd: 18271,
      totalRewards: 2440,
      pendingClaims: 720,
      activeFarms: 6,
      monthGrowth: 12.4
    });

    _writeStore('seeded', true);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  // Every function returns a Promise. Always use await or .then().
  // Same signatures work whether MODE is 'demo' or 'live'.

  const API = {
    version: API_VERSION,
    mode: MODE,

    // ─── DASHBOARD STATS ──
    async getStats() {
      _seedIfEmpty();
      await _delay(150);
      if (MODE === 'live') return _supabase('stats?select=*');
      return _readStore('stats', {});
    },

    // ─── WALLETS ──
    async getWallets() {
      _seedIfEmpty();
      await _delay(150);
      if (MODE === 'live') return _supabase('wallets?select=*&order=id.asc');
      return _readStore('wallets', []);
    },
    async addWallet(wallet) {
      if (MODE === 'live') return _supabase('wallets', { method: 'POST', body: wallet });
      const wallets = _readStore('wallets', []);
      wallet.id = Date.now();
      wallets.push(wallet);
      _writeStore('wallets', wallets);
      return wallet;
    },
    async deleteWallet(id) {
      if (MODE === 'live') return _supabase('wallets?id=eq.' + id, { method: 'DELETE' });
      const wallets = _readStore('wallets', []).filter(w => w.id !== id);
      _writeStore('wallets', wallets);
      return { ok: true };
    },

    // ─── AIRDROPS ──
    async getAirdrops() {
      _seedIfEmpty();
      await _delay(150);
      if (MODE === 'live') return _supabase('airdrops?select=*&order=priority.desc');
      return _readStore('airdrops', []);
    },
    async updateAirdrop(id, patch) {
      if (MODE === 'live') return _supabase('airdrops?id=eq.' + id, { method: 'PATCH', body: patch });
      const airdrops = _readStore('airdrops', []);
      const idx = airdrops.findIndex(a => a.id === id);
      if (idx >= 0) { Object.assign(airdrops[idx], patch); _writeStore('airdrops', airdrops); }
      return airdrops[idx];
    },

    // ─── MISSIONS ──
    async getMissions() {
      _seedIfEmpty();
      await _delay(150);
      if (MODE === 'live') return _supabase('missions?select=*');
      return _readStore('missions', []);
    },
    async completeMission(id) {
      if (MODE === 'live') return _supabase('missions?id=eq.' + id, { method: 'PATCH', body: { done: true } });
      const missions = _readStore('missions', []);
      const m = missions.find(x => x.id === id);
      if (m) { m.done = true; _writeStore('missions', missions); }
      return m;
    },

    // ─── REWARDS ──
    async getRewards() {
      _seedIfEmpty();
      await _delay(150);
      if (MODE === 'live') return _supabase('rewards?select=*&order=date.desc');
      return _readStore('rewards', []);
    },

    // ─── REPORTS ──
    async generateReport(type, format) {
      await _delay(800);
      const report = {
        id: Date.now(),
        type: type,
        format: format,
        date: new Date().toISOString(),
        sizeKb: Math.floor(Math.random() * 4000) + 800,
        downloadUrl: '#' // In live mode this comes from Supabase Storage
      };
      const list = _readStore('reports', []);
      list.unshift(report);
      _writeStore('reports', list);
      return report;
    },
    async getReports() {
      await _delay(120);
      return _readStore('reports', []);
    },

    // ─── PROFILE / USER PREFERENCES ──
    async getProfile() {
      const user = JSON.parse(localStorage.getItem('dropelite_user') || '{}');
      return Object.assign({
        name: user.name || 'Demo User',
        email: user.email || 'demo@dropelite.com',
        plan: 'Pro',
        joined: '2025-01-15',
        chains: ['Ethereum', 'Arbitrum', 'Base', 'Solana'],
        prefs: _readStore('prefs', { theme: 'gold-dark', notifications: true, intensity: 3 })
      }, {});
    },
    async updateProfile(patch) {
      const prefs = _readStore('prefs', {});
      Object.assign(prefs, patch.prefs || {});
      _writeStore('prefs', prefs);
      return { ok: true };
    },

    // ─── PAYMENTS (Razorpay / Stripe webhook receivers in live mode) ──
    async getSubscription() {
      return _readStore('subscription', {
        plan: 'Pro',
        status: 'active',
        amount: 999,
        currency: 'INR',
        nextBilling: '2026-06-01',
        provider: 'Razorpay'
      });
    },
    async createCheckoutSession(plan, provider) {
      // In live mode: POST to your serverless function that returns Razorpay/Stripe URL
      await _delay(400);
      return {
        ok: true,
        checkoutUrl: provider === 'stripe'
          ? 'https://checkout.stripe.com/demo'
          : 'https://checkout.razorpay.com/demo',
        sessionId: 'sess_' + Date.now()
      };
    },

    // ─── ADMIN-ONLY (consumed by admin.html) ──
    async adminListUsers() {
      return _readStore('admin_users', [
        { id: 1, name: 'Rejaul K',     email: 'rejaul@dropelite.com', plan: 'Pro',  status: 'active',   joined: '2025-01-15' },
        { id: 2, name: 'Asrina K',     email: 'asrina@example.com',   plan: 'Free', status: 'active',   joined: '2025-04-22' },
        { id: 3, name: 'Test User',    email: 'test@example.com',     plan: 'Pro',  status: 'inactive', joined: '2025-03-10' },
        { id: 4, name: 'Demo Account', email: 'demo@dropelite.com',   plan: 'Free', status: 'active',   joined: '2025-02-01' }
      ]);
    },
    async adminListPayments() {
      return _readStore('admin_payments', [
        { id: 'pay_001', user: 'rejaul@dropelite.com',  amount: 1999, currency: 'INR', plan: 'Pro Annual',  provider: 'Razorpay', status: 'success', date: '2025-04-15' },
        { id: 'pay_002', user: 'asrina@example.com',    amount: 999,  currency: 'INR', plan: 'Pro Monthly', provider: 'Razorpay', status: 'success', date: '2025-04-20' },
        { id: 'pay_003', user: 'test@example.com',      amount: 1999, currency: 'INR', plan: 'Pro Annual',  provider: 'Stripe',   status: 'failed',  date: '2025-04-22' },
        { id: 'pay_004', user: 'demo@dropelite.com',    amount: 999,  currency: 'INR', plan: 'Pro Monthly', provider: 'Razorpay', status: 'success', date: '2025-05-01' }
      ]);
    },
    async adminListContent() {
      return _readStore('admin_content', [
        { id: 1, type: 'announcement', title: 'New airdrop tracker live!', published: true,  date: '2025-05-10' },
        { id: 2, type: 'guide',        title: 'LayerZero farming guide',    published: true,  date: '2025-04-28' },
        { id: 3, type: 'announcement', title: 'Pro plan price update',      published: false, date: '2025-05-12' }
      ]);
    },
    async adminSaveUser(user) {
      const users = await this.adminListUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user; else { user.id = Date.now(); users.push(user); }
      _writeStore('admin_users', users);
      return user;
    },
    async adminDeleteUser(id) {
      const users = (await this.adminListUsers()).filter(u => u.id !== id);
      _writeStore('admin_users', users);
      return { ok: true };
    },
    async adminSaveContent(content) {
      const list = await this.adminListContent();
      const idx = list.findIndex(c => c.id === content.id);
      if (idx >= 0) list[idx] = content; else { content.id = Date.now(); list.push(content); }
      _writeStore('admin_content', list);
      return content;
    },
    async adminDeleteContent(id) {
      const list = (await this.adminListContent()).filter(c => c.id !== id);
      _writeStore('admin_content', list);
      return { ok: true };
    },
    async adminGetStats() {
      const users    = await this.adminListUsers();
      const payments = await this.adminListPayments();
      return {
        totalUsers:    users.length,
        activeUsers:   users.filter(u => u.status === 'active').length,
        paidUsers:     users.filter(u => u.plan !== 'Free').length,
        totalRevenue:  payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0),
        failedPayments: payments.filter(p => p.status === 'failed').length,
        currency: 'INR'
      };
    }
  };

  // Expose globally
  window.API = API;
})();
