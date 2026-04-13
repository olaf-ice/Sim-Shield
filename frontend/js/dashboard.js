// ============================================================
// dashboard.js — User Dashboard + Declare SIMs (API-powered) + Security
// ============================================================

const Dashboard = (() => {

  // ── Score ring renderer ────────────────────────────────────
  function renderScoreRing(score, band) {
    const circumference = 408;
    const offset = circumference - (score / 100) * circumference;
    return `
      <div class="score-ring-wrap">
        <div class="score-ring">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle class="ring-bg" cx="80" cy="80" r="65"/>
            <circle class="ring-fill" id="score-ring-fill" cx="80" cy="80" r="65"
              stroke="${band.color}" style="stroke-dashoffset:${circumference};" data-offset="${offset}"/>
          </svg>
          <div class="ring-text">
            <div class="score-number risk-${band.level}" id="score-number-display">0</div>
            <div class="score-label">Risk Score</div>
          </div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:${band.color};">${band.emoji} ${band.label}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Identity Risk Level</div>
        </div>
      </div>`;
  }

  function animateScore(targetScore) {
    const ring  = document.getElementById('score-ring-fill');
    const numEl = document.getElementById('score-number-display');
    if (!ring || !numEl) return;
    const targetOffset = parseFloat(ring.dataset.offset);
    setTimeout(() => { ring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'; ring.style.strokeDashoffset = targetOffset; }, 200);
    let current = 0; const steps = 60; const inc = targetScore / steps;
    const timer = setInterval(() => { current = Math.min(current + inc, targetScore); numEl.textContent = Math.round(current); if (current >= targetScore) clearInterval(timer); }, 1200 / steps);
  }

  // ── Trial / Subscription banner ────────────────────────────
  function trialBanner(user) {
    if (!user.trialActive && !user.subscriptionActive) return '';
    const days = user.daysLeft || 0;

    if (user.trialActive) {
      const urgency = days <= 2;
      const color   = urgency ? 'var(--red)' : 'var(--green)';
      const border  = urgency ? 'rgba(255,51,102,0.35)' : 'rgba(0,255,136,0.25)';
      const icon    = urgency ? '🚨' : '🎁';
      const msg     = urgency
        ? `Your free trial ends in <strong>${days} day${days !== 1 ? 's' : ''}</strong>! Subscribe now to keep your access.`
        : `You have <strong>${days} day${days !== 1 ? 's' : ''} left</strong> on your free trial. Subscribe to continue after it ends.`;
      return `<div class="fade-in" style="background:rgba(5,11,26,0.8);border:1px solid ${border};border-left:4px solid ${color};border-radius:var(--radius-md);padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:22px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${color};letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Free Trial · ${days} Day${days !== 1 ? 's' : ''} Remaining</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${msg}</div></div>
        ${urgency ? `<button class="btn btn-primary btn-sm" onclick="App.navigate('payment')" style="flex-shrink:0;">Subscribe ₦2,000</button>` : `<button onclick="this.closest('[style]').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:0;flex-shrink:0;">×</button>`}
      </div>`;
    }

    if (user.subscriptionActive) {
      const expiry = user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
        : '—';
      const color  = days <= 14 ? 'var(--amber)' : 'var(--blue)';
      const border = days <= 14 ? 'rgba(255,184,0,0.35)' : 'rgba(79,142,247,0.25)';
      return `<div class="fade-in" style="background:rgba(5,11,26,0.8);border:1px solid ${border};border-left:4px solid ${color};border-radius:var(--radius-md);padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">🛡️</span>
        <div style="flex:1;font-size:13px;color:var(--text-secondary);"><strong style="color:${color};">SimShield Pro Active</strong> · Expires ${expiry} · ${days} days left</div>
        <button onclick="this.closest('[style]').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:0;">×</button>
      </div>`;
    }
    return '';
  }

  // ── "Last check" banner ────────────────────────────────────
  function lastCheckBanner(user) {
    if (!user.lastVisit) return '';
    const daysSince = Math.floor((Date.now() - new Date(user.lastVisit).getTime()) / 86400000);
    if (daysSince < 7) return '';
    let urgency, icon, msg, color, borderColor;
    if (daysSince >= 60) {
      urgency = 'High'; icon = '🚨'; color = 'var(--red)'; borderColor = 'rgba(255,51,102,0.35)';
      msg = `It's been <strong>${daysSince} days</strong> since your last check. Fraud can happen fast — recheck your SIM status now.`;
    } else if (daysSince >= 30) {
      urgency = 'Medium'; icon = '⚠️'; color = 'var(--amber)'; borderColor = 'rgba(255,184,0,0.35)';
      msg = `Last check was <strong>${daysSince} days ago</strong>. We recommend rechecking monthly.`;
    } else {
      urgency = 'Low'; icon = '📊'; color = 'var(--blue)'; borderColor = 'rgba(79,142,247,0.3)';
      msg = `Last check: <strong>${daysSince} days ago</strong>. Your risk data has been refreshed.`;
    }
    return `<div class="fade-in" style="background:rgba(5,11,26,0.8);border:1px solid ${borderColor};border-left:4px solid ${color};border-radius:var(--radius-md);padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
      <span style="font-size:22px;flex-shrink:0;">${icon}</span>
      <div style="flex:1;"><div style="font-size:12px;font-weight:800;color:${color};letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">${urgency} Priority · Return Check</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${msg}</div></div>
      <button onclick="this.closest('[style]').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:0;flex-shrink:0;" title="Dismiss">×</button>
    </div>`;
  }

  // ── Notifications Dropdown ─────────────────────────────────
  let notificationsOpen = false;

  async function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    notificationsOpen = !notificationsOpen;
    if (!notificationsOpen) {
      dropdown.style.display = 'none';
      return;
    }
    dropdown.style.display = 'block';
    dropdown.innerHTML = `<div style="padding:24px;text-align:center;"><div class="processing-ring" style="width:24px;height:24px;margin:0 auto;border:2px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>`;
    
    try {
      const res = await Api.get('/auth/notifications');
      const unreadCount = res.notifications.filter(n => !n.read).length;
      document.getElementById('unread-badge').style.display = unreadCount > 0 ? 'inline-block' : 'none';
      
      let html = `<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:800;font-size:14px;">Instant Security Alerts</span>
      </div><div style="max-height:300px;overflow-y:auto;padding:8px 0;">`;
      
      if (res.notifications.length === 0) {
        html += `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No security alerts.</div>`;
      } else {
        html += res.notifications.map(n => `
          <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);background:${n.read ? 'transparent' : 'rgba(255,51,102,0.05)'};">
            <div style="font-size:13px;font-weight:700;color:${n.read ? 'var(--text-secondary)' : 'var(--red)'};margin-bottom:4px;">${n.title}</div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">${n.message}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:6px;opacity:0.6;">${new Date(n.createdAt).toLocaleString()}</div>
          </div>
        `).join('');
      }
      html += `</div>`;
      dropdown.innerHTML = html;

      if (unreadCount > 0) {
        await Api.post('/auth/notifications/read', {});
        setTimeout(() => { document.getElementById('unread-badge').style.display = 'none'; }, 2000);
      }
    } catch (e) {
      dropdown.innerHTML = `<div style="padding:20px;color:var(--red);font-size:13px;">Failed to load alerts.</div>`;
    }
  }

  // ── User Dashboard ─────────────────────────────────────────
  async function renderUserDashboard() {
    const user = Auth.currentUser();
    if (!user) { App.navigate('login'); return; }

    const el = document.getElementById('view-dashboard');
    el.innerHTML = `<nav class="navbar"><a href="#" class="navbar-brand"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a>
      <div class="navbar-actions">
        <!-- Notification Bell -->
        <button class="btn btn-ghost btn-sm" style="position:relative;padding:0 8px;" onclick="Dashboard.toggleNotifications()">
          <span style="font-size:18px;">🔔</span>
          <span id="unread-badge" style="display:none;position:absolute;top:8px;right:6px;width:8px;height:8px;background:var(--red);border-radius:50%;box-shadow:0 0 0 2px var(--bg-card);"></span>
        </button>
        <!-- Security Settings -->
        <button class="btn btn-ghost btn-sm" style="padding:0 8px;" onclick="Dashboard.renderSecurityView()">
          <span style="font-size:18px;">⚙️</span>
        </button>
        <span style="font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:6px;margin:0 8px;"><span style="width:8px;height:8px;background:var(--green);border-radius:50%;display:inline-block;"></span>${user.name||user.phone}</span>
        <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Sign Out</button>
      </div>
      <!-- Dropdown -->
      <div id="notifications-dropdown" style="display:none;position:absolute;top:60px;right:20px;width:340px;background:var(--bg-card);border:1px solid var(--border-active);border-radius:12px;z-index:999;box-shadow:0 10px 40px rgba(0,0,0,0.6);overflow:hidden;"></div>
      </nav>
      <div class="page-container" style="max-width:700px;">
        ${trialBanner(user)}
        ${lastCheckBanner(user)}
        <div style="margin-bottom:28px;" class="fade-in"><div style="font-size:14px;color:var(--text-muted);margin-bottom:4px;">Good ${getGreeting()},</div>
        <h2 style="font-size:24px;font-weight:900;letter-spacing:-0.5px;">${user.name||'New User'} 👋</h2></div>
        <div id="risk-card-wrap" class="fade-in" style="margin-bottom:20px;"><div class="card card-glow" style="padding:32px 24px;"><div style="display:flex;justify-content:center;align-items:center;padding:40px;"><div class="processing-ring" style="width:50px;height:50px;border:3px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div></div></div></div>
        <div id="stats-wrap" class="fade-in" style="margin-bottom:20px;"></div>
        <div id="sims-wrap" class="fade-in" style="margin-bottom:20px;"></div>
        <div class="section-title">QUICK ACTIONS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:80px;" class="fade-in">
          <button class="card" style="text-align:left;border:none;cursor:pointer;background:var(--red-dim);border:1px solid rgba(255,51,102,0.3);" onclick="App.navigate('report')"><div style="font-size:28px;margin-bottom:10px;">🚨</div><div style="font-weight:700;font-size:15px;color:var(--red);">Report Fraud</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Report suspicious SIM activity</div></button>
          <button class="card" style="text-align:left;border:none;cursor:pointer;background:var(--green-dim);border:1px solid rgba(0,255,136,0.3);" onclick="App.navigate('declare')"><div style="font-size:28px;margin-bottom:10px;">📱</div><div style="font-weight:700;font-size:15px;color:var(--green);">Declare SIMs</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Register your SIM numbers</div></button>
          <button class="card" style="text-align:left;border:none;cursor:pointer;" onclick="App.navigate('my-reports')"><div style="font-size:28px;margin-bottom:10px;">📋</div><div style="font-weight:700;font-size:15px;">My Reports</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">View submitted reports</div></button>
          <button class="card" style="text-align:left;border:none;cursor:pointer;background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.2);" onclick="App.navigate('admin')"><div style="font-size:28px;margin-bottom:10px;">🖥️</div><div style="font-weight:700;font-size:15px;color:var(--blue);">Intel Hub</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">National fraud overview</div></button>
        </div>
      </div>
      <div class="bottom-nav">
        <button class="bottom-nav-btn active"><span class="nav-icon">📊</span><span>Dashboard</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('report')"><span class="nav-icon">🚨</span><span>Report</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('my-reports')"><span class="nav-icon">📋</span><span>My Reports</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('declare')"><span class="nav-icon">📱</span><span>My SIMs</span></button>
      </div>`;

    renderRiskAndStats(user);
    
    // Check unread notifications badge
    try {
      const res = await Api.get('/auth/notifications');
      if (res.notifications.filter(n => !n.read).length > 0) {
        document.getElementById('unread-badge').style.display = 'inline-block';
      }
    } catch(e) {}
  }

  async function renderRiskAndStats(user) {
    try {
      const result = await Api.get('/risk/score');
      const riskCard = document.getElementById('risk-card-wrap');
      riskCard.innerHTML = `<div class="card card-glow" style="margin-bottom:0;padding:32px 24px;">${renderScoreRing(result.score, result)}
        ${result.reasons.length > 0 ? `<div style="margin-top:24px;display:flex;flex-direction:column;gap:8px;">${result.reasons.map(r=>`<div class="alert alert-warning" style="padding:10px 14px;"><span class="alert-icon">⚠️</span><span style="font-size:13px;">${r}</span></div>`).join('')}</div>`
        : `<div class="alert alert-success" style="margin-top:24px;"><span class="alert-icon">✅</span><span>No fraud signals detected on your identity. Stay vigilant!</span></div>`}
      </div>`;
      setTimeout(() => animateScore(result.score), 100);

      const myReports = await Api.get('/reports/mine');
      document.getElementById('stats-wrap').innerHTML = `<div class="stats-grid">
        <div class="stat-card"><div class="stat-value" style="color:var(--green);">${user.simCount||0}</div><div class="stat-label">SIMs Declared</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--blue);">${myReports.reports.length}</div><div class="stat-label">Reports Filed</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--amber);">${result.score}</div><div class="stat-label">Risk Score</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--${result.level==='low'?'green':'red'});">${result.level.toUpperCase()}</div><div class="stat-label">Risk Level</div></div>
      </div>`;

      const simsWrap = document.getElementById('sims-wrap');
      if ((user.sims||[]).length > 0) {
        simsWrap.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div class="section-title" style="margin-bottom:0;">📱 My Registered SIMs</div><button class="btn btn-ghost btn-sm" onclick="App.navigate('declare')">Manage</button></div><div style="display:flex;flex-direction:column;gap:10px;">${user.sims.map(s=>renderSimCard(s)).join('')}</div></div>`;
      } else {
        simsWrap.innerHTML = `<div class="card" style="border-color:var(--amber);background:var(--amber-dim);"><div style="display:flex;align-items:center;gap:14px;"><span style="font-size:28px;">📱</span><div style="flex:1;"><div style="font-weight:700;margin-bottom:4px;">Declare Your SIMs</div><div style="font-size:13px;color:var(--text-muted);">Add your registered SIM numbers to improve your risk score accuracy.</div></div><button class="btn btn-primary btn-sm" onclick="App.navigate('declare')">Add SIMs</button></div></div>`;
      }
    } catch (err) {
      document.getElementById('risk-card-wrap').innerHTML = `<div class="card"><div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>${err.message}</span></div></div>`;
    }
  }

  function renderSimCard(sim) {
    const net = NETWORKS.find(n => n.id === sim.network);
    const netClass = {MTN:'net-mtn',Airtel:'net-airtel',Glo:'net-glo','9mobile':'net-9mob'}[sim.network]||'';
    return `<div class="sim-card"><div class="sim-dot ${netClass}">${net?.emoji||'📱'}</div><div class="sim-info"><div class="sim-network">${net?.label||sim.network}</div><div class="sim-number">${sim.number||'Number not provided'}</div></div><span class="badge badge-green">✓ Declared</span></div>`;
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; return 'evening';
  }

  // ── Declare SIMs view ──────────────────────────────────────
  async function renderDeclareView() {
    const user = Auth.currentUser();
    if (!user) { App.navigate('login'); return; }

    let simCount = user.simCount || 0;
    window._declareSims      = [...(user.sims || [])];
    window._declareSimCount  = simCount;

    const el = document.getElementById('view-declare');
    el.innerHTML = `<nav class="navbar"><a href="#" class="navbar-brand" onclick="App.navigate('dashboard')"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a><div class="navbar-actions"><button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">← Back</button></div></nav>
      <div class="page-container"><div class="page-header"><h2>📱 Declare My SIMs</h2><p>Tell us how many SIM cards are officially registered to you and which networks they belong to.</p></div>
      <div class="alert alert-info fade-in" style="margin-bottom:24px;"><span class="alert-icon">ℹ️</span><span>By law, a Nigerian can register a maximum of <strong>1 SIM per network</strong> (up to 4 total). Declaring your SIMs helps us detect misuse.</span></div>
      <div class="card fade-in" style="margin-bottom:20px;"><div class="section-title">HOW MANY SIMS DO YOU OWN?</div>
        <div class="count-selector"><button class="count-btn" onclick="Dashboard.adjustCount(-1)">−</button><div class="count-display" id="sim-count-display">${simCount}</div><button class="count-btn" onclick="Dashboard.adjustCount(1)">+</button></div>
        <div style="margin-top:14px;font-size:13px;color:var(--text-muted);" id="sim-count-hint">${simCount > 3 ? '⚠️ High SIM count may increase your risk score.' : simCount === 0 ? 'Tap + to add SIMs' : `${simCount} SIM${simCount>1?'s':''} selected`}</div>
      </div>
      <div id="sim-builder" class="fade-in"></div>
      <div style="display:flex;gap:10px;margin-top:24px;margin-bottom:80px;">
        <button class="btn btn-ghost" onclick="App.navigate('dashboard')">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" id="save-sims-btn" onclick="Dashboard.saveSims()">💾 Save My SIMs</button>
      </div></div>
      <div class="bottom-nav">
        <button class="bottom-nav-btn" onclick="App.navigate('dashboard')"><span class="nav-icon">📊</span><span>Dashboard</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('report')"><span class="nav-icon">🚨</span><span>Report</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('my-reports')"><span class="nav-icon">📋</span><span>My Reports</span></button>
        <button class="bottom-nav-btn active"><span class="nav-icon">📱</span><span>My SIMs</span></button>
      </div>`;
    renderSimBuilder();
  }

  function adjustCount(delta) {
    let count = Math.max(0, Math.min(4, window._declareSimCount + delta));
    window._declareSimCount = count;
    document.getElementById('sim-count-display').textContent = count;
    const hint = document.getElementById('sim-count-hint');
    if (hint) hint.textContent = count > 3 ? '⚠️ High SIM count may increase your risk score.' : count === 0 ? 'Tap + to add SIMs' : `${count} SIM${count>1?'s':''} selected`;
    while (window._declareSims.length < count) window._declareSims.push({ network:'', number:'' });
    window._declareSims = window._declareSims.slice(0, count);
    renderSimBuilder();
  }

  function renderSimBuilder() {
    const builder = document.getElementById('sim-builder');
    if (!builder) return;
    const sims = window._declareSims;
    if (!sims.length) { builder.innerHTML = ''; return; }
    builder.innerHTML = sims.map((sim, i) => `
      <div class="card fade-in" style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:14px;">SIM CARD ${i+1}</div>
        <div class="form-group" style="margin-bottom:14px;"><label class="form-label">Network Provider</label>
          <div class="network-grid">${NETWORKS.map(n=>`<button class="network-btn ${sim.network===n.id?'selected':''}" onclick="Dashboard.setSimNetwork(${i},'${n.id}')"><span class="network-emoji">${n.emoji}</span><span>${n.label}</span></button>`).join('')}</div>
        </div>
        <div class="form-group" style="margin-bottom:0;"><label class="form-label">Phone Number (Optional)</label>
          <div style="position:relative;"><span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;">🇳🇬</span>
          <input class="form-input" style="padding-left:42px;" type="tel" maxlength="11" placeholder="08012345678" value="${sim.number||''}" oninput="Dashboard.setSimNumber(${i},this.value)" id="sim-number-${i}"/></div>
        </div>
      </div>`).join('');
  }

  function setSimNetwork(i, network) { window._declareSims[i].network = network; renderSimBuilder(); }
  function setSimNumber(i, value)    { window._declareSims[i].number  = value; }

  async function saveSims() {
    const sims  = window._declareSims;
    const count = window._declareSimCount;
    for (let i = 0; i < sims.length; i++) {
      if (!sims[i].network) { Toast.show(`Please select a network for SIM ${i+1}`, 'error'); return; }
    }
    const btn = document.getElementById('save-sims-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const data = await Api.put('/users/sims', { simCount: count, sims });
      const user = Auth.currentUser();
      user.simCount = data.simCount;
      user.sims     = data.sims;
      Api.setUser(user);
      Toast.show(`${count} SIM${count!==1?'s':''} saved successfully!`, 'success');
      App.navigate('dashboard');
    } catch (err) {
      Toast.show(err.message, 'error');
      btn.disabled = false; btn.textContent = '💾 Save My SIMs';
    }
  }

  // ── Security View ──────────────────────────────────────────
  async function renderSecurityView() {
    const user = Auth.currentUser();
    if (!user) return;
    
    // We re-use dashboard container but build security screen
    const el = document.getElementById('view-dashboard');
    el.innerHTML = `<nav class="navbar"><a href="#" class="navbar-brand" onclick="Dashboard.renderUserDashboard()"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a><div class="navbar-actions"><button class="btn btn-ghost btn-sm" onclick="Dashboard.renderUserDashboard()">← Dashboard</button></div></nav>
      <div class="page-container fade-in">
        <div class="page-header"><h2>⚙️ Security Settings</h2><p>Manage your bank-level security features.</p></div>
        
        <div class="card" style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-weight:700;font-size:16px;">Multi-Factor Authentication (MFA)</div>
            ${user.mfaEnabled ? `<span class="badge badge-green">Enabled</span>` : `<span class="badge" style="background:var(--bg);color:var(--text-muted);border:1px solid var(--border);">Disabled</span>`}
          </div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;line-height:1.5;">Protect your account with an Authenticator App (like Google Authenticator or Authy). This stops most account hacks.</p>
          ${user.mfaEnabled 
            ? `<div class="alert alert-success"><span class="alert-icon">✅</span><span>MFA is actively protecting your account.</span></div>`
            : `<button class="btn btn-primary btn-sm" onclick="Dashboard.setupMFA()">Enable MFA</button>`}
        </div>

        <div class="card">
          <div style="display:grid;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;">
              <span style="font-size:24px;">📱</span>
              <div><div style="font-weight:700;font-size:14px;">SIM Swap Tracking</div><div style="font-size:12px;color:var(--text-muted);">Alerts when your registered SIM list is modified.</div></div>
              <span style="margin-left:auto;color:var(--green);">Active</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;">
              <span style="font-size:24px;">💻</span>
              <div><div style="font-weight:700;font-size:14px;">Instant Device Alerts</div><div style="font-size:12px;color:var(--text-muted);">Notifies you of logins from unknown devices.</div></div>
              <span style="margin-left:auto;color:var(--green);">Active</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;">
              <span style="font-size:24px;">🔒</span>
              <div><div style="font-weight:700;font-size:14px;">Brute-Force Protection</div><div style="font-size:12px;color:var(--text-muted);">Locks account after 3 failed OTP/MFA attempts.</div></div>
              <span style="margin-left:auto;color:var(--green);">Active</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function setupMFA() {
    Auth.requireReAuth(async () => {
      try {
        const res = await Api.post('/auth/mfa/setup', {});
        const el = document.getElementById('view-dashboard');
        el.innerHTML = `
          <nav class="navbar"><a href="#" class="navbar-brand" onclick="Dashboard.renderSecurityView()"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a><div class="navbar-actions"><button class="btn btn-ghost btn-sm" onclick="Dashboard.renderSecurityView()">Cancel</button></div></nav>
          <div class="page-container fade-in">
            <h2 style="font-size:20px;font-weight:900;margin-bottom:12px;">Setup Authenticator</h2>
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">1. Scan this QR code with Google Authenticator or Authy.</p>
            <div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;margin-bottom:24px;">
              <img src="${res.qrCode}" alt="MFA QR Code" width="200" height="200" style="display:block;"/>
            </div>
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">2. Enter the 6-digit code from the app.</p>
            <div class="form-group">
              <input class="form-input" style="max-width:260px;font-size:20px;letter-spacing:4px;text-align:center;" type="text" maxlength="6" inputmode="numeric" id="mfa-verify-input" placeholder="000000"/>
            </div>
            <button class="btn btn-primary" id="mfa-confirm-btn" style="max-width:260px;width:100%;" onclick="Dashboard.enableMFA('${res.tempSecret}')">Verify & Enable</button>
          </div>
        `;
      } catch (err) { Toast.show(err.message, 'error'); }
    }, 'setup Two-Factor Auth');
  }

  async function enableMFA(tempSecret) {
    const token = document.getElementById('mfa-verify-input').value;
    if(token.length !== 6) return Toast.show('Enter 6-digit code', 'error');
    const btn = document.getElementById('mfa-confirm-btn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const res = await Api.post('/auth/mfa/enable', { token, tempSecret });
      Api.setUser(res.user);
      Toast.show('Two-Factor Auth Enabled! 🔐', 'success');
      renderSecurityView();
    } catch(err) {
      Toast.show(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Verify & Enable';
    }
  }

  return { 
    renderUserDashboard, renderDeclareView, adjustCount, setSimNetwork, setSimNumber, saveSims, renderSimCard,
    toggleNotifications, renderSecurityView, setupMFA, enableMFA
  };
})();

window.Dashboard = Dashboard;
