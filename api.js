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
      // Mirror email into profiles so admins can see all signups
      if (data.user) {
        await supa.from('profiles').upsert({
          id:     data.user.id,
          email:  email,
          name:   name || email.split('@')[0],
          plan:   'Free',
          status: 'active'
        }, { onConflict: 'id' });
      }
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
        difficulty:    m.difficulty   || 'easy',
        verified:      m.verified !== false,
        time_minutes:  m.time_minutes != null ? m.time_minutes : 5,
        est_value_usd: m.est_value_usd != null ? Number(m.est_value_usd) : 0,
        display_order: m.display_order != null ? m.display_order : 0,
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
        .from('missions').select('xp, title').eq('id', missionId).single();
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

      // Log it for the activity feed (only on a genuinely new completion)
      if (!cErr) {
        this.logActivity('mission', 'Mission Complete',
          (mission.title || 'Mission') + ' · +' + (mission.xp || 0) + ' XP');
      }
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
    // OVERVIEW HERO STATS  ·  LIVE (Supabase)
    // Gathers every number the Overview "ELITE FARMING COMMAND"
    // section needs, in ONE call. All real data — no fake values.
    // ───────────────────────────────────────────────────────────
    async getOverviewStats() {
      // Empty/safe shape so the UI never crashes if something fails
      const empty = {
        name: 'Farmer',
        missionsDone: 0, missionsTotal: 0,
        xpToday: 0, totalXp: 0,
        currentStreak: 0, longestStreak: 0,
        activeAirdrops: 0, highPriorityAirdrops: 0,
        walletsActive: 0,
        estRewardsUsd: 0, claimingSoon: 0,
        activeDrops: 0
      };
      if (!_live()) return empty;

      const user = await this.getCurrentUser();
      if (!user) return empty;

      try {
        // Run all reads in parallel — faster on mobile
        const [missions, progress, airdrops, wallets, rewards, profile] =
          await Promise.all([
            this.getMissions(),
            this.getProgress(),
            this.getAirdrops(),
            this.getWallets(),
            this.getRewards(),
            this.getProfile()
          ]);

        // ── Missions: today's progress ──
        const missionsTotal = missions.length;
        const doneList      = missions.filter(m => m.done);
        const missionsDone  = doneList.length;
        const xpToday       = doneList.reduce((s, m) => s + (m.xp || 0), 0);

        // ── Airdrops: active opportunities ──
        // "active" = anything not finished/dead. High priority via category/status text.
        const activeAirdrops = airdrops.filter(a => {
          const st = String(a.status || '').toLowerCase();
          return st !== 'completed' && st !== 'ended' && st !== 'inactive';
        });
        const highPriorityAirdrops = activeAirdrops.filter(a => {
          const tag = (String(a.category || '') + ' ' + String(a.status || '')).toLowerCase();
          return tag.indexOf('high') !== -1 || tag.indexOf('priority') !== -1 || tag.indexOf('urgent') !== -1;
        }).length;

        // ── Wallets: count (real). "inactive" detection needs Phase 4 APIs. ──
        const walletsActive = wallets.length;

        // ── Rewards: estimated future value + claiming soon ──
        // Sum usd_value of rewards still in play (not expired, not claimed).
        const liveRewards = rewards.filter(r => {
          const st = String(r.status || '').toLowerCase();
          return st !== 'claimed' && st !== 'expired';
        });
        const estRewardsUsd = liveRewards.reduce((s, r) => {
          const v = Number(r.usd_value);
          return s + (isNaN(v) ? 0 : v);
        }, 0);
        // "claiming soon" = pending/eligible with a deadline inside 72h
        const now = Date.now();
        const claimingSoon = rewards.filter(r => {
          const st = String(r.status || '').toLowerCase();
          if (st !== 'pending' && st !== 'eligible') return false;
          if (!r.deadline) return false;
          const dl = new Date(r.deadline).getTime();
          return !isNaN(dl) && dl > now && (dl - now) <= 72 * 3600 * 1000;
        }).length;

        return {
          name: (profile && profile.name) ? profile.name
               : (user.email ? user.email.split('@')[0] : 'Farmer'),
          missionsDone:         missionsDone,
          missionsTotal:        missionsTotal,
          xpToday:              xpToday,
          totalXp:              progress.total_xp || 0,
          currentStreak:        progress.current_streak || 0,
          longestStreak:        progress.longest_streak || 0,
          activeAirdrops:       activeAirdrops.length,
          highPriorityAirdrops: highPriorityAirdrops,
          walletsActive:        walletsActive,
          estRewardsUsd:        Math.round(estRewardsUsd),
          claimingSoon:         claimingSoon,
          activeDrops:          activeAirdrops.length
        };
      } catch (e) {
        console.error('getOverviewStats:', e);
        return empty;
      }
    },

    // Real claim-deadline alerts for the Overview "Alerts" panel.
    // Pulls rewards that are pending/eligible with a deadline still ahead.
    // (Gas / wallet-inactive / snapshot alerts need Phase 4 blockchain APIs.)
    async getClaimAlerts() {
      if (!_live()) return [];
      try {
        const rewards = await this.getRewards();
        const now = Date.now();
        return rewards
          .filter(r => {
            const st = String(r.status || '').toLowerCase();
            if (st !== 'pending' && st !== 'eligible') return false;
            if (!r.deadline) return false;
            const dl = new Date(r.deadline).getTime();
            return !isNaN(dl) && dl > now;
          })
          .map(r => ({
            project:  r.project || 'Reward',
            usdValue: Number(r.usd_value) || 0,
            deadline: r.deadline,
            msLeft:   new Date(r.deadline).getTime() - now
          }))
          .sort((a, b) => a.msLeft - b.msLeft)
          .slice(0, 5);
      } catch (e) {
        console.error('getClaimAlerts:', e);
        return [];
      }
    },

    // Count of missions this user completed in the last 7 days.
    // Powers the Overview "Weekly Completion" stat card.
    async getWeeklyCompletions() {
      if (!_live()) return 0;
      try {
        const user = await this.getCurrentUser();
        if (!user) return 0;
        // 7 days ago, as YYYY-MM-DD
        const since = new Date(Date.now() - 7 * 86400000)
          .toISOString().slice(0, 10);
        const { count, error } = await supa
          .from('mission_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('completed_on', since);
        if (error) { console.error('getWeeklyCompletions:', error); return 0; }
        return count || 0;
      } catch (e) {
        console.error('getWeeklyCompletions:', e);
        return 0;
      }
    },

    // ───────────────────────────────────────────────────────────
    // ACTIVITY LOG  ·  LIVE (Supabase)
    // Records real user actions for the Overview "Live Activity Feed".
    // ───────────────────────────────────────────────────────────

    // Write one activity event. Fire-and-forget — never blocks or
    // breaks the action it is logging (a failed log is not fatal).
    async logActivity(kind, title, detail) {
      if (!_live()) return;
      try {
        const user = await this.getCurrentUser();
        if (!user) return;
        await supa.from('activity_log').insert({
          user_id: user.id,
          kind:    kind,
          title:   title,
          detail:  detail || null
        });
      } catch (e) {
        console.error('logActivity:', e);   // logged, but never thrown
      }
    },

    // Read this user's recent activity, newest first.
    async getActivityFeed(limit) {
      if (!_live()) return [];
      try {
        const user = await this.getCurrentUser();
        if (!user) return [];
        const { data, error } = await supa
          .from('activity_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit || 20);
        if (error) { console.error('getActivityFeed:', error); return []; }
        return data || [];
      } catch (e) {
        console.error('getActivityFeed:', e);
        return [];
      }
    },

    // Per-day mission completions + XP for the last 7 days (Mon→Sun of
    // the current week). Powers the Overview "Weekly Farming Activity"
    // chart and the "this week" stat boxes.
    async getWeeklyActivity() {
      // 7 day-slots, Monday first
      const empty = {
        days: [0, 0, 0, 0, 0, 0, 0],   // mission count per day Mon..Sun
        totalMissions: 0,
        totalXp: 0
      };
      if (!_live()) return empty;
      try {
        const user = await this.getCurrentUser();
        if (!user) return empty;

        // Find Monday of the current week (UTC)
        const now = new Date();
        const dow = (now.getUTCDay() + 6) % 7;   // 0 = Monday
        const monday = new Date(Date.UTC(
          now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
        const mondayStr = monday.toISOString().slice(0, 10);

        const { data, error } = await supa
          .from('mission_completions')
          .select('completed_on, xp_earned')
          .eq('user_id', user.id)
          .gte('completed_on', mondayStr);
        if (error) { console.error('getWeeklyActivity:', error); return empty; }

        const result = { days: [0, 0, 0, 0, 0, 0, 0], totalMissions: 0, totalXp: 0 };
        (data || []).forEach(row => {
          const d = new Date(row.completed_on + 'T00:00:00Z');
          const idx = (d.getUTCDay() + 6) % 7;   // 0 = Monday
          if (idx >= 0 && idx < 7) {
            result.days[idx] += 1;
            result.totalMissions += 1;
            result.totalXp += (row.xp_earned || 0);
          }
        });
        return result;
      } catch (e) {
        console.error('getWeeklyActivity:', e);
        return empty;
      }
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
            display_order: mission.display_order,
            difficulty:    mission.difficulty || 'easy',
            verified:      mission.verified !== false,
            time_minutes:  mission.time_minutes != null ? mission.time_minutes : 5,
            est_value_usd: mission.est_value_usd != null ? mission.est_value_usd : 0
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
            display_order: mission.display_order || 0,
            difficulty:    mission.difficulty || 'easy',
            verified:      mission.verified !== false,
            time_minutes:  mission.time_minutes != null ? mission.time_minutes : 5,
            est_value_usd: mission.est_value_usd != null ? mission.est_value_usd : 0
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
      this.logActivity('airdrop', 'Airdrop Tracked',
        (data.name || 'New airdrop') + (data.chain ? ' · ' + data.chain : ''));
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
      this.logActivity('wallet', 'Wallet Added',
        (data.name || 'New wallet') + (data.chains ? ' · ' + data.chains : ''));
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
      this.logActivity('reward', 'Reward Tracked',
        (data.project || 'New reward') +
        (data.usd_value ? ' · ~$' + Number(data.usd_value).toLocaleString() : ''));
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
        display_order:    opp.display_order == null ? 0 : parseInt(opp.display_order, 10),
        deadline:         opp.deadline || null,
        completion_pct:   (opp.completion_pct === '' || opp.completion_pct == null) ? 0 : parseInt(opp.completion_pct, 10)
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

    // ───────────────────────────────────────────────────────────
    // INTEL — FUNDING ROUNDS  ·  LIVE (Supabase)
    //   intel_funding — admin-published "Recent Funding Rounds"
    // ───────────────────────────────────────────────────────────
    async getFundingRounds() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_funding')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getFundingRounds:', error); return []; }
      return data || [];
    },

    async adminListFunding() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_funding')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListFunding:', error); return []; }
      return data || [];
    },

    async adminSaveFunding(f) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const fields = {
        name:          f.name,
        subtitle:      f.subtitle || null,
        amount:        f.amount || null,
        accent_color:  f.accent_color || '#a78bfa',
        active:        f.active !== false,
        display_order: f.display_order == null ? 0 : parseInt(f.display_order, 10)
      };
      if (f.id) {
        const { error } = await supa.from('intel_funding').update(fields).eq('id', f.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: f.id };
      } else {
        const { data, error } = await supa.from('intel_funding').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteFunding(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_funding').delete().eq('id', id);
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

    // ─── User-facing: list active alerts (newest deadlines first by display order) ───
    async getAlerts() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_alerts')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getAlerts:', error); return []; }
      return data || [];
    },

    // ─── Admin: alerts ───
    async adminListAlerts() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_alerts')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListAlerts:', error); return []; }
      return data || [];
    },

    async adminSaveAlert(alert) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const fields = {
        name:          alert.name,
        description:   alert.description || null,
        priority:      alert.priority || 'HIGH',
        style:         alert.style || 'red',
        deadline:      alert.deadline || null,
        active:        alert.active !== false,
        display_order: alert.display_order == null ? 0 : parseInt(alert.display_order, 10)
      };
      if (alert.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('intel_alerts').update(fields).eq('id', alert.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: alert.id };
      } else {
        const { data, error } = await supa.from('intel_alerts').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteAlert(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_alerts').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ─── Market Intelligence Dashboard (single-row settings) ───

    // User + admin both read the same single record
    async getMarketIntel() {
      if (!_live()) return null;
      const { data, error } = await supa
        .from('intel_market')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) { console.error('getMarketIntel:', error); return null; }
      return data;
    },

    // Admin: update the single market record (id is always 1)
    async adminSaveMarketIntel(m) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };

      const asArray = v => Array.isArray(v) ? v : [];

      const fields = {
        chain_activity_value: m.chain_activity_value || '+0%',
        chain_activity_sub:   m.chain_activity_sub || null,
        chain_activity_bars:  asArray(m.chain_activity_bars),
        funding_value:        m.funding_value || '$0',
        funding_sub:          m.funding_sub || null,
        funding_spark:        asArray(m.funding_spark),
        heatmap:              asArray(m.heatmap),
        heatmap_peak:         m.heatmap_peak || null,
        heatmap_low:          m.heatmap_low || null,
        flow_value:           m.flow_value || '$0',
        flow_sub:             m.flow_sub || null,
        flow_rows:            asArray(m.flow_rows),
        score_value:          m.score_value || '0',
        score_sub:            m.score_sub || null,
        score_bars:           asArray(m.score_bars),
        score_rows:           asArray(m.score_rows),
        updated_at:           new Date().toISOString()
      };

      const { error } = await supa
        .from('intel_market')
        .update(fields)
        .eq('id', 1);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ─── Ecosystem Intelligence Matrix ───
    async getEcosystems() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_ecosystems')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getEcosystems:', error); return []; }
      return data || [];
    },

    async adminListEcosystems() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_ecosystems')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListEcosystems:', error); return []; }
      return data || [];
    },

    async adminSaveEcosystem(eco) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const fields = {
        name:          eco.name,
        subtitle:      eco.subtitle || null,
        icon:          eco.icon || null,
        icon_bg:       eco.icon_bg || null,
        accent_color:  eco.accent_color || null,
        growth:        eco.growth || null,
        protocols:     (eco.protocols === '' || eco.protocols == null) ? null : parseInt(eco.protocols, 10),
        reward_prob:   (eco.reward_prob === '' || eco.reward_prob == null) ? null : parseInt(eco.reward_prob, 10),
        competition:   eco.competition || null,
        activity:      (eco.activity === '' || eco.activity == null) ? null : parseInt(eco.activity, 10),
        momentum:      (eco.momentum === '' || eco.momentum == null) ? null : parseInt(eco.momentum, 10),
        active:        eco.active !== false,
        display_order: eco.display_order == null ? 0 : parseInt(eco.display_order, 10)
      };
      if (eco.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('intel_ecosystems').update(fields).eq('id', eco.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: eco.id };
      } else {
        const { data, error } = await supa.from('intel_ecosystems').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteEcosystem(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_ecosystems').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ─── Alpha Recommendations ───
    async getRecommendations() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_recommendations')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('getRecommendations:', error); return []; }
      return data || [];
    },

    async adminListRecommendations() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('intel_recommendations')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) { console.error('adminListRecommendations:', error); return []; }
      return data || [];
    },

    async adminSaveRecommendation(rec) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };

      let tags = [];
      if (Array.isArray(rec.tags)) {
        tags = rec.tags
          .map(t => {
            if (typeof t === 'string') return { t: t, c: 'badge-cyan' };
            if (t && t.t) return { t: String(t.t), c: String(t.c || 'badge-cyan') };
            return null;
          })
          .filter(Boolean)
          .slice(0, 3);
      }

      const fields = {
        title:         rec.title,
        description:   rec.description || null,
        icon:          rec.icon || null,
        tags:          tags,
        active:        rec.active !== false,
        display_order: rec.display_order == null ? 0 : parseInt(rec.display_order, 10)
      };
      if (rec.id) {
        fields.updated_at = new Date().toISOString();
        const { error } = await supa.from('intel_recommendations').update(fields).eq('id', rec.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: rec.id };
      } else {
        const { data, error } = await supa.from('intel_recommendations').insert(fields).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
    },

    async adminDeleteRecommendation(id) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('intel_recommendations').delete().eq('id', id);
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

    // ── Subscription: read plan from profiles ──
    async getSubscription() {
      if (!_live()) return { plan: 'Free', status: 'active', amount: 0, currency: 'INR', provider: 'Razorpay' };
      const profile = await this.getProfile();
      if (!profile) return { plan: 'Free', status: 'active', amount: 0, currency: 'INR', provider: 'Razorpay' };
      const plan = profile.plan || 'Free';
      return {
        plan:     plan,
        status:   profile.status || 'active',
        amount:   plan === 'Pro Annual' ? 1999 : plan === 'Pro' ? 999 : 0,
        currency: 'INR',
        nextBilling: null,
        provider: 'Razorpay'
      };
    },
    async createCheckoutSession(plan, provider) {
      await _delay(400);
      return {
        ok: true,
        checkoutUrl: provider === 'stripe' ? 'https://checkout.stripe.com/demo' : 'https://checkout.razorpay.com/demo',
        sessionId: 'sess_' + Date.now()
      };
    },

    // ── Admin: Users — reads from profiles table ──
    async adminListUsers() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('profiles')
        .select('id, name, email, role, plan, status, created_at')
        .order('created_at', { ascending: false });
      if (error) { console.error('adminListUsers:', error); return []; }
      return (data || []).map(u => ({
        id:     u.id,
        name:   u.name   || '—',
        email:  u.email  || '—',
        plan:   u.plan   || 'Free',
        status: u.status || 'active',
        role:   u.role   || 'user',
        joined: u.created_at ? u.created_at.slice(0, 10) : '—'
      }));
    },

    async adminSaveUser(user) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      if (!user.id) return { ok: false, error: 'User ID required' };
      const { error } = await supa.from('profiles').update({
        name:       user.name,
        plan:       user.plan,
        status:     user.status,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    async adminDeleteUser(id) {
      if (!_live()) return { ok: true };
      // Soft-delete: mark status 'deleted' (anon key cannot remove auth.users)
      const { error } = await supa.from('profiles').update({
        status:     'deleted',
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ── Admin: Payments — reads from payments table ──
    async adminListPayments() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('adminListPayments:', error); return []; }
      return (data || []).map(p => ({
        id:       p.id,
        user:     p.user_email || '—',
        plan:     p.plan       || '—',
        amount:   p.amount     || 0,
        currency: p.currency   || 'INR',
        provider: p.provider   || '—',
        status:   p.status     || 'success',
        date:     p.created_at ? p.created_at.slice(0, 10) : '—'
      }));
    },

    // ── Admin: Content — reads from content table ──
    async adminListContent() {
      if (!_live()) return [];
      const { data, error } = await supa
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('adminListContent:', error); return []; }
      return (data || []).map(c => ({
        id:        c.id,
        title:     c.title,
        type:      c.type,
        published: c.published,
        date:      c.created_at ? c.created_at.slice(0, 10) : '—'
      }));
    },

    async adminSaveContent(content) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      if (content.id) {
        const { error } = await supa.from('content').update({
          title:      content.title,
          type:       content.type,
          published:  content.published,
          updated_at: new Date().toISOString()
        }).eq('id', content.id);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await supa.from('content').insert({
          title:     content.title,
          type:      content.type,
          published: content.published || false
        });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true };
    },

    async adminDeleteContent(id) {
      if (!_live()) return { ok: true };
      const { error } = await supa.from('content').delete().eq('id', id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ── Admin: Stats — derived from real profiles + payments ──
    async adminGetStats() {
      if (!_live()) return { totalUsers: 0, activeUsers: 0, paidUsers: 0, totalRevenue: 0, failedPayments: 0, currency: 'INR' };
      try {
        const [ud, pd] = await Promise.all([
          supa.from('profiles').select('plan, status'),
          supa.from('payments').select('amount, status')
        ]);
        const users    = ud.data || [];
        const payments = pd.data || [];
        return {
          totalUsers:     users.length,
          activeUsers:    users.filter(u => u.status === 'active').length,
          paidUsers:      users.filter(u => u.plan && u.plan !== 'Free').length,
          totalRevenue:   payments.filter(p => p.status === 'success').reduce((s, p) => s + (p.amount || 0), 0),
          failedPayments: payments.filter(p => p.status === 'failed').length,
          currency: 'INR'
        };
      } catch (e) {
        console.error('adminGetStats:', e);
        return { totalUsers: 0, activeUsers: 0, paidUsers: 0, totalRevenue: 0, failedPayments: 0, currency: 'INR' };
      }
    },

    // ── Admin: Settings — reads/writes settings table (id=1) ──
    async adminGetSettings() {
      if (!_live()) return { price_monthly: 999, price_annual: 1999, razorpay_key: '', stripe_key: '' };
      const { data, error } = await supa.from('settings').select('*').eq('id', 1).single();
      if (error) { console.error('adminGetSettings:', error); return { price_monthly: 999, price_annual: 1999 }; }
      return data || {};
    },

    async adminSaveSettings(patch) {
      if (!_live()) return { ok: false, error: 'Supabase not configured' };
      const { error } = await supa.from('settings').update(
        Object.assign({}, patch, { updated_at: new Date().toISOString() })
      ).eq('id', 1);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // ── Analytics: aggregate real user data for the Analytics tab KPIs ──
    async getAnalyticsStats() {
      if (!_live()) return { totalRewardsUsd: 0, roiPct: 0, efficiencyScore: 0, totalInteractions: 0, ecosystemsCount: 0, successRate: 0 };
      try {
        const [rewards, airdrops, missions, wallets] = await Promise.all([
          this.getRewards(),
          this.getAirdrops(),
          this.getMissions(),
          this.getWallets()
        ]);

        const totalRewardsUsd = rewards.reduce((s, r) => {
          const v = Number(r.usd_value != null ? r.usd_value : (r.reward_usd || 0));
          return s + (isNaN(v) ? 0 : v);
        }, 0);

        const chains = new Set(airdrops.map(a => a.chain).filter(Boolean));
        const ecosystemsCount = Math.max(chains.size, wallets.length);

        const totalMissions = missions.length;
        const doneMissions  = missions.filter(m => m.done).length;
        const successRate   = totalMissions > 0 ? Math.round((doneMissions / totalMissions) * 100) : 0;

        const avgElig = airdrops.length > 0
          ? airdrops.reduce((s, a) => s + (a.eligibility || a.progress || 0), 0) / airdrops.length
          : 0;
        const efficiencyScore = Math.min(99, Math.round((successRate * 0.5) + (avgElig * 0.5)));

        const totalInteractions = rewards.length + airdrops.length + wallets.length + doneMissions;

        return {
          totalRewardsUsd:   Math.round(totalRewardsUsd),
          roiPct:            successRate,
          efficiencyScore:   efficiencyScore,
          totalInteractions: totalInteractions,
          ecosystemsCount:   ecosystemsCount,
          successRate:       successRate
        };
      } catch (e) {
        console.error('getAnalyticsStats:', e);
        return { totalRewardsUsd: 0, roiPct: 0, efficiencyScore: 0, totalInteractions: 0, ecosystemsCount: 0, successRate: 0 };
      }
    }
  };

  window.API = API;
})();
