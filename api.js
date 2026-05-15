/* ═══════════════════════════════════════════════════════════════════════════
   DROPELITE — API LAYER (api.js)  ·  LIVE / SUPABASE VERSION
   ───────────────────────────────────────────────────────────────────────────
   LIVE (real Supabase): Auth · Daily Missions · Airdrops · Wallets · Rewards · Farming Routes · Intel Hub
   DEMO (not yet wired): Reports · Profile · Admin (Users/Payments/Content)

   ⚠️ BEFORE THIS WORKS: paste your Supabase URL + anon key below (STEP 7b).
═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // STEP 7b — PASTE YOUR SUPABASE KEYS HERE
  // Get these from Supabase → Settings → API
  // ═══════════════════════════════════════════════════════════════
  const SUPABASE_URL = 'https://brfeekixpjbwqoooxcte.supabase.co';   // e.g. https://abcd1234.supabase.co
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZmVla2l4cGpid3Fvb294Y3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTIwNzUsImV4cCI6MjA5NDI2ODA3NX0.agL3ZVc4QvtPvI35kNDYdEhluBEn4lScRtNmsxgcajs'; // the long eyJhbGc... string
  // ═══════════════════════════════════════════════════════════════

  // ─── Initialize Supabase client ───
  let supa = null;
  try {
    if (window.supabase && SUPABASE_URL.indexOf('http') === 0) {
      supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {
    console.error('Supabase init failed:', e);
  }

  function _live() { return supa !== null; }

  // Today's date as YYYY-MM-DD in UTC (matches our 00:00 UTC reset rule)
  function _todayUTC() { return new Date().toISOString().slice(0, 10); }

  function _delay(ms) { return new Promise(r => setTimeout(r, ms || 150)); }

  // ─── localStorage helpers (still used by not-yet-wired tabs) ───
  function _readStore(key, fallback) {
    try {
      const raw = localStorage.getItem('dropelite_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function _writeStore(key, value) {
    try { localStorage.setItem('dropelite_' + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function _seedIfEmpty() {
    if (_readStore('seeded', false)) return;
    _writeStore('wallets', [
      { id: 1, label: 'Main Wallet',  address: '0x7a8f...3c2b', chain: 'Ethereum', balance: 2.45, usd: 8240 },
      { id: 2, label: 'Farm Wallet',  address: '0x9d1e...8f4a', chain: 'Arbitrum', balance: 1.20, usd: 4030 },
      { id: 3, label: 'L2 Wallet',    address: '0x4b2c...7e9d', chain: 'Base',     balance: 0.85, usd: 2856 },
      { id: 4, label: 'Solana Hot',   address: 'Hx9f...Vb3K',   chain: 'Solana',   balance: 18.5, usd: 3145 }
    ]);
    _writeStore('airdrops', [
      { id: 1, name: 'LayerZero', chain: 'Ethereum', status: 'farming',  priority: 'high',   eligibility: 92, estValue: 4200 },
      { id: 2, name: 'zkSync',    chain: 'zkSync',   status: 'farming',  priority: 'high',   eligibility: 88, estValue: 3800 },
      { id: 3, name: 'Scroll',    chain: 'Scroll',   status: 'farming',  priority: 'medium', eligibility: 75, estValue: 1500 },
      { id: 4, name: 'Linea',     chain: 'Linea',    status: 'farming',  priority: 'medium', eligibility: 68, estValue: 1200 },
      { id: 5, name: 'Eclipse',   chain: 'Eclipse',  status: 'watching', priority: 'high',   eligibility: 0,  estValue: 0    },
      { id: 6, name: 'Monad',     chain: 'Monad',    status: 'farming',  priority: 'high',   eligibility: 84, estValue: 2900 }
    ]);
    _writeStore('rewards', [
      { id: 1, project: 'Arbitrum', amount: 1250, token: 'ARB',  usd: 1340, status: 'claimed', date: '2025-03-22' },
      { id: 2, project: 'Jupiter',  amount: 420,  token: 'JUP',  usd: 380,  status: 'claimed', date: '2025-04-15' },
      { id: 3, project: 'StarkNet', amount: 1800, token: 'STRK', usd: 720,  status: 'pending', date: '2025-05-01' }
    ]);
    _writeStore('stats', { totalUsd: 18271, totalRewards: 2440, pendingClaims: 720, activeFarms: 6, monthGrowth: 12.4 });
    _writeStore('seeded', true);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  const API = {
    isLive: _live,
    _supa: function() { return supa; },

    // ───────────────────────────────────────────────────────────
    // AUTH (used by auth.js)
    // ───────────────────────────────────────────────────────────
    async signUp(email, password, name) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { data, error } = await supa.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: name || email.split('@')[0] } }
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user };
    },

    async signIn(email, password) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { data, error } = await supa.auth.signInWithPassword({
        email: email, password: password
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user, session: data.session };
    },

    async signOut() {
      if (_live()) await supa.auth.signOut();
      return { ok: true };
    },

    async getCurrentUser() {
      if (!_live()) return null;
      const { data } = await supa.auth.getUser();
      return data ? data.user : null;
    },

    async getProfile() {
      if (!_live()) return null;
      const user = await this.getCurrentUser();
      if (!user) return null;
      const { data, error } = await supa
        .from('profiles').select('*').eq('id', user.id).single();
      if (error) { console.error('getProfile:', error); return null; }
      return data;
    },

    // ───────────────────────────────────────────────────────────
    // DAILY MISSIONS  ·  LIVE (Supabase)
    // ───────────────────────────────────────────────────────────

    // Today's active missions + whether current user completed each
    async getMissions() {
      if (!_live()) { _seedIfEmpty(); await _delay(); return _readStore('missions', []); }

      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data: missions, error: mErr } = await supa
        .from('missions').select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (mErr) { console.error('getMissions:', mErr); return []; }

      const { data: completions, error: cErr } = await supa
        .from('mission_completions').select('mission_id')
        .eq('user_id', user.id)
        .eq('completed_on', _todayUTC());
      if (cErr) { console.error('getCompletions:', cErr); }

      const doneIds = new Set((completions || []).map(c => c.mission_id));

      return (missions || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        xp: m.xp,
        project: m.project,
        done: doneIds.has(m.id)
      }));
    },

    // Mark a mission complete for today (idempotent — safe to call twice)
    async completeMission(missionId) {
      if (!_live()) {
        const missions = _readStore('missions', []);
        const m = missions.find(x => x.id === missionId);
        if (m) { m.done = true; _writeStore('missions', missions); }
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { data: mission, error: mErr } = await supa
        .from('missions').select('xp').eq('id', missionId).single();
      if (mErr) return { ok: false, error: mErr.message };

      const { error: cErr } = await supa
        .from('mission_completions')
        .insert({
          user_id: user.id,
          mission_id: missionId,
          completed_on: _todayUTC(),
          xp_earned: mission.xp
        });

      // Duplicate = already done today = not a real error
      if (cErr && cErr.message.indexOf('duplicate') === -1) {
        return { ok: false, error: cErr.message };
      }

      await this._updateProgress(user.id, mission.xp);
      return { ok: true, xpEarned: mission.xp };
    },

    // Internal: recalc XP total + streak after a completion
    async _updateProgress(userId, xpJustEarned) {
      const { data: prog } = await supa
        .from('user_progress').select('*').eq('user_id', userId).single();

      const today = _todayUTC();
      let streak  = prog ? prog.current_streak : 0;
      let longest = prog ? prog.longest_streak : 0;
      const lastActive = prog ? prog.last_active_date : null;

      // Streak logic with 3-day grace period
      if (lastActive === today) {
        // already counted today — no change
      } else if (lastActive === null) {
        streak = 1;
      } else {
        const last = new Date(lastActive + 'T00:00:00Z');
        const now  = new Date(today + 'T00:00:00Z');
        const daysGap = Math.round((now - last) / 86400000);

        if (daysGap === 1) {
          streak = streak + 1;                       // consecutive day
        } else if (daysGap >= 2 && daysGap <= 4) {
          streak = streak + 1;                       // within 3-day grace → continue
        } else {
          streak = 1;                                // missed 4+ days → reset
        }
      }
      if (streak > longest) longest = streak;

      const newXp = (prog ? prog.total_xp : 0) + xpJustEarned;

      await supa
        .from('user_progress')
        .update({
          total_xp: newXp,
          current_streak: streak,
          longest_streak: longest,
          last_active_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    },

    // User's progress (XP, streak) for the hero stats
    async getProgress() {
      if (!_live()) {
        return { total_xp: 840, current_streak: 23, longest_streak: 47, last_active_date: _todayUTC() };
      }
      const user = await this.getCurrentUser();
      if (!user) return { total_xp: 0, current_streak: 0, longest_streak: 0 };

      const { data, error } = await supa
        .from('user_progress').select('*').eq('user_id', user.id).single();
      if (error || !data) return { total_xp: 0, current_streak: 0, longest_streak: 0 };
      return data;
    },

    // ───────────────────────────────────────────────────────────
    // ADMIN — MISSIONS MANAGEMENT  ·  LIVE (Supabase)
    // ───────────────────────────────────────────────────────────
    async adminListMissions() {
      if (!_live()) return _readStore('missions', []);
      const { data, error } = await supa
        .from('missions').select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListMissions:', error); return []; }
      return data || [];
    },

    async adminSaveMission(mission) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      if (mission.id) {
        const { error } = await supa
          .from('missions')
          .update({
            title: mission.title,
            description: mission.description,
            xp: mission.xp,
            project: mission.project,
            active: mission.active,
            display_order: mission.display_order
          })
          .eq('id', mission.id);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await supa
          .from('missions')
          .insert({
            title: mission.title,
            description: mission.description,
            xp: mission.xp,
            project: mission.project,
            active: mission.active !== false,
            display_order: mission.display_order || 0
          });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true };
    },

    async adminDeleteMission(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('missions').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // AIRDROPS TRACKER  ·  LIVE (Supabase) — personal, user-owned
    // ───────────────────────────────────────────────────────────

    // Get all airdrops belonging to the current user
    async getAirdrops() {
      if (!_live()) { _seedIfEmpty(); await _delay(); return _readStore('airdrops', []); }

      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supa
        .from('airdrops')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) { console.error('getAirdrops:', error); return []; }
      return data || [];
    },

    // Add a new airdrop for the current user
    async addAirdrop(airdrop) {
      if (!_live()) {
        const airdrops = _readStore('airdrops', []);
        airdrop.id = Date.now();
        airdrops.push(airdrop);
        _writeStore('airdrops', airdrops);
        return { ok: true, airdrop: airdrop };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { data, error } = await supa
        .from('airdrops')
        .insert({
          user_id:      user.id,
          name:         airdrop.name,
          ticker:       airdrop.ticker || null,
          chain:        airdrop.chain || null,
          category:     airdrop.category || null,
          status:       airdrop.status || 'watching',
          progress:     airdrop.progress || 0,
          reward_usd:   airdrop.reward_usd || 0,
          wallets_used: airdrop.wallets_used || null,
          notes:        airdrop.notes || null,
          date_joined:  airdrop.date_joined || null
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, airdrop: data };
    },

    // Update an existing airdrop (only the user's own — RLS enforces this)
    async updateAirdrop(id, patch) {
      if (!_live()) {
        const airdrops = _readStore('airdrops', []);
        const idx = airdrops.findIndex(a => a.id === id);
        if (idx >= 0) { Object.assign(airdrops[idx], patch); _writeStore('airdrops', airdrops); }
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const updates = { updated_at: new Date().toISOString() };
      // Only copy known fields (ignore anything unexpected)
      ['name','ticker','chain','category','status','progress',
       'reward_usd','wallets_used','notes','date_joined'].forEach(f => {
        if (patch[f] !== undefined) updates[f] = patch[f];
      });

      const { error } = await supa
        .from('airdrops')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // Delete an airdrop (only the user's own)
    async deleteAirdrop(id) {
      if (!_live()) {
        _writeStore('airdrops', _readStore('airdrops', []).filter(a => a.id !== id));
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { error } = await supa
        .from('airdrops')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // WALLETS  ·  LIVE (Supabase) — personal, user-owned
    // ───────────────────────────────────────────────────────────

    // Get all wallets belonging to the current user
    async getWallets() {
      if (!_live()) { _seedIfEmpty(); await _delay(); return _readStore('wallets', []); }

      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supa
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) { console.error('getWallets:', error); return []; }
      return data || [];
    },

    // Add a new wallet for the current user
    async addWallet(wallet) {
      if (!_live()) {
        const wallets = _readStore('wallets', []);
        wallet.id = Date.now();
        wallets.push(wallet);
        _writeStore('wallets', wallets);
        return { ok: true, wallet: wallet };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { data, error } = await supa
        .from('wallets')
        .insert({
          user_id: user.id,
          name:    wallet.name,
          address: wallet.address || null,
          chains:  wallet.chains || null,
          status:  wallet.status || 'active',
          label:   wallet.label || null,
          notes:   wallet.notes || null
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, wallet: data };
    },

    // Update an existing wallet (RLS ensures only the user's own)
    async updateWallet(id, patch) {
      if (!_live()) {
        const wallets = _readStore('wallets', []);
        const idx = wallets.findIndex(w => w.id === id);
        if (idx >= 0) { Object.assign(wallets[idx], patch); _writeStore('wallets', wallets); }
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const updates = { updated_at: new Date().toISOString() };
      ['name','address','chains','status','label','notes'].forEach(f => {
        if (patch[f] !== undefined) updates[f] = patch[f];
      });

      const { error } = await supa
        .from('wallets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // Delete a wallet (only the user's own)
    async deleteWallet(id) {
      if (!_live()) {
        _writeStore('wallets', _readStore('wallets', []).filter(w => w.id !== id));
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { error } = await supa
        .from('wallets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // REWARDS  ·  LIVE (Supabase) — personal, user-owned
    // ───────────────────────────────────────────────────────────

    // Get all rewards belonging to the current user
    async getRewards() {
      if (!_live()) { _seedIfEmpty(); await _delay(); return _readStore('rewards', []); }

      const user = await this.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supa
        .from('rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) { console.error('getRewards:', error); return []; }
      return data || [];
    },

    // Add a new reward for the current user
    async addReward(reward) {
      if (!_live()) {
        const rewards = _readStore('rewards', []);
        reward.id = Date.now();
        rewards.push(reward);
        _writeStore('rewards', rewards);
        return { ok: true, reward: reward };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { data, error } = await supa
        .from('rewards')
        .insert({
          user_id:        user.id,
          project:        reward.project,
          subtitle:       reward.subtitle || null,
          chain:          reward.chain || null,
          wallet_address: reward.wallet_address || null,
          amount:         (reward.amount === '' || reward.amount == null) ? null : Number(reward.amount),
          token:          reward.token || null,
          usd_value:      (reward.usd_value === '' || reward.usd_value == null) ? null : Number(reward.usd_value),
          status:         reward.status || 'eligible',
          deadline:       reward.deadline || null,
          claimed_at:     reward.claimed_at || null,
          claim_url:      reward.claim_url || null,
          notes:          reward.notes || null
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, reward: data };
    },

    // Update an existing reward (RLS ensures only the user's own)
    async updateReward(id, patch) {
      if (!_live()) {
        const rewards = _readStore('rewards', []);
        const idx = rewards.findIndex(r => r.id === id);
        if (idx >= 0) { Object.assign(rewards[idx], patch); _writeStore('rewards', rewards); }
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const updates = { updated_at: new Date().toISOString() };
      ['project','subtitle','chain','wallet_address','amount','token',
       'usd_value','status','deadline','claimed_at','claim_url','notes'].forEach(f => {
        if (patch[f] !== undefined) {
          // Numeric fields: convert empty strings to null
          if ((f === 'amount' || f === 'usd_value') && (patch[f] === '' || patch[f] == null)) {
            updates[f] = null;
          } else if (f === 'amount' || f === 'usd_value') {
            updates[f] = Number(patch[f]);
          } else {
            updates[f] = patch[f];
          }
        }
      });

      const { error } = await supa
        .from('rewards')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // Delete a reward (only the user's own)
    async deleteReward(id) {
      if (!_live()) {
        _writeStore('rewards', _readStore('rewards', []).filter(r => r.id !== id));
        return { ok: true };
      }

      const user = await this.getCurrentUser();
      if (!user) return { ok: false, error: 'Not signed in' };

      const { error } = await supa
        .from('rewards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // FARMING ROUTES  ·  LIVE (Supabase) — admin-published content
    // Users READ routes (active ones). Admins manage them.
    // ───────────────────────────────────────────────────────────

    // ─── User-facing: list active routes (for dashboard Featured Routes grid) ───
    async getRoutes() {
      if (!_live()) return [];

      // Fetch routes + their step count in one go using a Supabase relation
      const { data, error } = await supa
        .from('routes')
        .select('*, route_steps(count)')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getRoutes:', error); return []; }

      // Flatten the steps count from the nested response
      return (data || []).map(r => ({
        ...r,
        steps_count: (r.route_steps && r.route_steps[0]) ? r.route_steps[0].count : 0
      }));
    },

    // ─── User-facing: fetch one route + all its ordered steps ───
    async getRoute(id) {
      if (!_live()) return null;

      const { data: route, error: rErr } = await supa
        .from('routes')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();
      if (rErr) { console.error('getRoute:', rErr); return null; }

      const { data: steps, error: sErr } = await supa
        .from('route_steps')
        .select('*')
        .eq('route_id', id)
        .order('display_order', { ascending: true });
      if (sErr) { console.error('getRoute steps:', sErr); }

      return Object.assign({}, route, { steps: steps || [] });
    },

    // ─── Admin: list ALL routes (active + inactive) ───
    async adminListRoutes() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('routes')
        .select('*, route_steps(count)')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListRoutes:', error); return []; }
      return (data || []).map(r => ({
        ...r,
        steps_count: (r.route_steps && r.route_steps[0]) ? r.route_steps[0].count : 0
      }));
    },

    // ─── Admin: fetch one route + steps (for editing) ───
    async adminGetRoute(id) {
      if (!_live()) return null;
      const { data: route, error: rErr } = await supa
        .from('routes').select('*').eq('id', id).single();
      if (rErr) { console.error('adminGetRoute:', rErr); return null; }
      const { data: steps } = await supa
        .from('route_steps').select('*')
        .eq('route_id', id)
        .order('display_order', { ascending: true });
      return Object.assign({}, route, { steps: steps || [] });
    },

    // ─── Admin: save route (insert if no id, update if id) ───
    async adminSaveRoute(route) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const fields = {
        name:           route.name,
        description:    route.description || null,
        chain:          route.chain || null,
        est_reward_usd: (route.est_reward_usd === '' || route.est_reward_usd == null) ? null : Number(route.est_reward_usd),
        gas_cost_usd:   (route.gas_cost_usd   === '' || route.gas_cost_usd   == null) ? null : Number(route.gas_cost_usd),
        time_minutes:   (route.time_minutes   === '' || route.time_minutes   == null) ? null : parseInt(route.time_minutes, 10),
        difficulty:     route.difficulty || null,
        badge:          route.badge || null,
        popularity:     route.popularity == null ? 0 : parseInt(route.popularity, 10),
        active:         route.active !== false,
        display_order:  route.display_order == null ? 0 : parseInt(route.display_order, 10)
      };

      if (route.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('routes').update(fields).eq('id', route.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: route.id };
      } else {
        const { data, error } = await supa.from('routes').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteRoute(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      // Steps cascade-delete automatically (foreign key has on delete cascade)
      const { error } = await supa.from('routes').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ─── Admin: save a step (insert if no id, update if id) ───
    async adminSaveStep(step) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      if (!step.route_id) return { ok: false, error: 'route_id is required' };

      const fields = {
        route_id:      step.route_id,
        display_order: step.display_order == null ? 0 : parseInt(step.display_order, 10),
        title:         step.title,
        description:   step.description || null,
        action_url:    step.action_url || null,
        action_label:  step.action_label || null,
        gas_estimate:  step.gas_estimate || null,
        time_estimate: step.time_estimate || null
      };

      if (step.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('route_steps').update(fields).eq('id', step.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: step.id };
      } else {
        const { data, error } = await supa.from('route_steps').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteStep(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('route_steps').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // INTEL HUB  ·  LIVE (Supabase) — admin-published content
    //   intel_opportunities — Top Farming Opportunities cards
    //   intel_signals       — Intelligence Feed entries
    // ───────────────────────────────────────────────────────────

    // ─── User-facing: list active opportunities ───
    async getOpportunities() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_opportunities')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getOpportunities:', error); return []; }
      return data || [];
    },

    // ─── User-facing: list active signals (newest first) ───
    async getSignals(limit) {
      if (!_live()) return [];
      const max = limit && limit > 0 ? limit : 50;
      const { data, error } = await supa
        .from('intel_signals')
        .select('*')
        .eq('active', true)
        .order('published_at', { ascending: false })
        .limit(max);
      if (error) { console.error('getSignals:', error); return []; }
      return data || [];
    },

    // ─── Admin: opportunities ───
    async adminListOpportunities() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_opportunities')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListOpportunities:', error); return []; }
      return data || [];
    },

    async adminSaveOpportunity(opp) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };

      // Normalize badges field (accept array of {t,c} or array of strings)
      let badges = [];
      if (Array.isArray(opp.badges)) {
        badges = opp.badges
          .map(b => {
            if (typeof b === 'string') {
              // Default color = badge-cyan
              return { t: b, c: 'badge-cyan' };
            }
            if (b && b.t) return { t: String(b.t), c: String(b.c || 'badge-cyan') };
            return null;
          })
          .filter(Boolean)
          .slice(0, 3);
      }

      const fields = {
        name:             opp.name,
        chain:            opp.chain || null,
        logo_letter:      opp.logo_letter || null,
        logo_class:       opp.logo_class || null,
        badges:           badges,
        funding:          opp.funding || null,
        reward:           opp.reward || null,
        difficulty_pct:   (opp.difficulty_pct === '' || opp.difficulty_pct == null) ? null : parseInt(opp.difficulty_pct, 10),
        difficulty_label: opp.difficulty_label || null,
        snapshot_prob:    (opp.snapshot_prob === '' || opp.snapshot_prob == null) ? null : parseInt(opp.snapshot_prob, 10),
        activity_score:   (opp.activity_score === '' || opp.activity_score == null) ? null : Number(opp.activity_score),
        popularity:       (opp.popularity === '' || opp.popularity == null) ? null : parseInt(opp.popularity, 10),
        competition:      opp.competition || null,
        trend:            opp.trend || null,
        urgency:          !!opp.urgency,
        featured:         !!opp.featured,
        rank_label:       opp.rank_label || null,
        active:           opp.active !== false,
        display_order:    opp.display_order == null ? 0 : parseInt(opp.display_order, 10)
      };

      if (opp.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('intel_opportunities').update(fields).eq('id', opp.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: opp.id };
      } else {
        const { data, error } = await supa.from('intel_opportunities').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteOpportunity(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_opportunities').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ─── Admin: signals ───
    async adminListSignals() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_signals')
        .select('*')
        .order('published_at', { ascending: false });
      if (error) { console.error('adminListSignals:', error); return []; }
      return data || [];
    },

    async adminSaveSignal(signal) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const fields = {
        title:        signal.title,
        body:         signal.body || null,
        category:     signal.category,
        url:          signal.url || null,
        published_at: signal.published_at || new Date().toISOString(),
        active:       signal.active !== false
      };
      if (signal.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('intel_signals').update(fields).eq('id', signal.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: signal.id };
      } else {
        const { data, error } = await supa.from('intel_signals').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteSignal(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_signals').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ───────────────────────────────────────────────────────────
    // EVERYTHING BELOW = STILL DEMO DATA (not wired to Supabase yet)
    // Converted tab-by-tab in future sessions.
    // ───────────────────────────────────────────────────────────
    async getStats() { _seedIfEmpty(); await _delay(); return _readStore('stats', {}); },
    async generateReport(type, format) {
      await _delay(800);
      const report = {
        id: Date.now(), type: type, format: format,
        date: new Date().toISOString(),
        sizeKb: Math.floor(Math.random() * 4000) + 800, downloadUrl: '#'
      };
      const list = _readStore('reports', []);
      list.unshift(report);
      _writeStore('reports', list);
      return report;
    },
    async getReports() { await _delay(120); return _readStore('reports', []); },

    async getSubscription() {
      return _readStore('subscription', {
        plan: 'Pro', status: 'active', amount: 999, currency: 'INR',
        nextBilling: '2026-06-01', provider: 'Razorpay'
      });
    },
    async createCheckoutSession(plan, provider) {
      await _delay(400);
      return {
        ok: true,
        checkoutUrl: provider === 'stripe' ? 'https://checkout.stripe.com/demo' : 'https://checkout.razorpay.com/demo',
        sessionId: 'sess_' + Date.now()
      };
    },

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
        { id: 'pay_001', user: 'rejaul@dropelite.com', amount: 1999, currency: 'INR', plan: 'Pro Annual',  provider: 'Razorpay', status: 'success', date: '2025-04-15' },
        { id: 'pay_002', user: 'asrina@example.com',   amount: 999,  currency: 'INR', plan: 'Pro Monthly', provider: 'Razorpay', status: 'success', date: '2025-04-20' },
        { id: 'pay_003', user: 'test@example.com',     amount: 1999, currency: 'INR', plan: 'Pro Annual',  provider: 'Stripe',   status: 'failed',  date: '2025-04-22' },
        { id: 'pay_004', user: 'demo@dropelite.com',   amount: 999,  currency: 'INR', plan: 'Pro Monthly', provider: 'Razorpay', status: 'success', date: '2025-05-01' }
      ]);
    },
    async adminListContent() {
      return _readStore('admin_content', [
        { id: 1, type: 'announcement', title: 'New airdrop tracker live!', published: true,  date: '2025-05-10' },
        { id: 2, type: 'guide',        title: 'LayerZero farming guide',   published: true,  date: '2025-04-28' },
        { id: 3, type: 'announcement', title: 'Pro plan price update',     published: false, date: '2025-05-12' }
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
      _writeStore('admin_users', (await this.adminListUsers()).filter(u => u.id !== id));
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
      _writeStore('admin_content', (await this.adminListContent()).filter(c => c.id !== id));
      return { ok: true };
    },
    async adminGetStats() {
      const users    = await this.adminListUsers();
      const payments = await this.adminListPayments();
      return {
        totalUsers:     users.length,
        activeUsers:    users.filter(u => u.status === 'active').length,
        paidUsers:      users.filter(u => u.plan !== 'Free').length,
        totalRevenue:   payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0),
        failedPayments: payments.filter(p => p.status === 'failed').length,
        currency: 'INR'
      };
    }
  };

  window.API = API;
})();
