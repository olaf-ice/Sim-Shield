// ============================================================
// admin.js — Admin Intelligence Dashboard (API-powered)
// ============================================================

const Admin = (() => {

  let activeTab = 'overview';
  let _analysis = null; // cached from last full fetch

  async function renderAdminView() {
    const el = document.getElementById('view-admin');
    el.innerHTML = `
      <nav class="navbar">
        <a href="#" class="navbar-brand" onclick="App.navigate('dashboard')"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a>
        <div class="navbar-actions"><span class="badge badge-red pulse">🔴 Intel Hub</span><button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">← Exit</button></div>
      </nav>
      <div class="admin-layout">
        <div class="admin-sidebar">
          <button class="admin-nav-btn active" id="anav-overview" onclick="Admin.showTab('overview')"><span>📊</span> Overview</button>
          <button class="admin-nav-btn" id="anav-flagged"  onclick="Admin.showTab('flagged')"><span>🚩</span> Flagged IDs</button>
          <button class="admin-nav-btn" id="anav-heatmap"  onclick="Admin.showTab('heatmap')"><span>🗺️</span> Heatmap</button>
          <button class="admin-nav-btn" id="anav-reports"  onclick="Admin.showTab('reports')"><span>📋</span> All Reports</button>
          <div style="flex:1;"></div>
          <div style="padding:12px;font-size:11px;color:var(--text-muted);line-height:1.6;"><div style="font-weight:700;margin-bottom:4px;">🛡️ NCC Ready</div>Data available for telco &amp; regulator access</div>
        </div>
        <div class="admin-content" id="admin-main-content">
          <div style="display:flex;justify-content:center;align-items:center;height:300px;">
            <div style="width:50px;height:50px;border:3px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
          </div>
        </div>
      </div>`;

    // Load all data needed for overview
    try {
      const [statsRes, heatmapRes, flaggedRes] = await Promise.all([
        Api.get('/admin/analytics'),
        Api.get('/admin/heatmap'),
        Api.get('/admin/flagged'),
      ]);
      _analysis = {
        total:      statsRes.stats.total,
        pending:    statsRes.stats.pending,
        verified:   statsRes.stats.verified,
        today:      statsRes.stats.today,
        networkMap: heatmapRes.networkMap,
        typeMap:    heatmapRes.typeMap,
        heatmap:    heatmapRes.heatmap,
        flagged:    flaggedRes.flagged,
      };
      document.getElementById('admin-main-content').innerHTML = renderOverview(_analysis);
      animateBars();
    } catch (err) {
      document.getElementById('admin-main-content').innerHTML = `<div class="alert alert-warning" style="margin:24px;"><span class="alert-icon">⚠️</span><span>${err.message}</span></div>`;
    }
  }

  function animateBars() {
    setTimeout(() => {
      document.querySelectorAll('.progress-bar-fill[data-width]').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
    }, 100);
  }

  // ── Overview Tab ─────────────────────────────────────────────
  function renderOverview(a) {
    const netDist = a.networkMap || {};
    const maxNet  = Math.max(...Object.values(netDist), 1);
    const typeDist = a.typeMap || {};
    const typeLabels = { not_mine:'SIM Not Mine', agent_fraud:'Agent Fraud', identity_theft:'ID Theft', sim_swap:'SIM Swap', other:'Other' };

    return `
      <div class="admin-stats">
        <div class="admin-stat"><div class="admin-stat-icon">📋</div><div class="admin-stat-value" style="color:var(--blue);">${a.total}</div><div class="admin-stat-label">Total Reports</div><div class="admin-stat-change">+${a.today} today</div></div>
        <div class="admin-stat"><div class="admin-stat-icon">🚩</div><div class="admin-stat-value" style="color:var(--red);">${(a.flagged||[]).length}</div><div class="admin-stat-label">Flagged Identities</div><div class="admin-stat-change">High-risk profiles</div></div>
        <div class="admin-stat"><div class="admin-stat-icon">⏳</div><div class="admin-stat-value" style="color:var(--amber);">${a.pending}</div><div class="admin-stat-label">Pending Review</div><div class="admin-stat-change">Needs investigation</div></div>
        <div class="admin-stat"><div class="admin-stat-icon">✅</div><div class="admin-stat-value" style="color:var(--green);">${a.verified}</div><div class="admin-stat-label">Verified Cases</div><div class="admin-stat-change">Confirmed fraud</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
        <div class="card"><div class="section-title">REPORTS BY NETWORK</div>
          ${Object.entries(netDist).map(([net, count]) => {
            const n = NETWORKS.find(x => x.id === net);
            const pct = Math.round((count / maxNet) * 100);
            const colors = {MTN:'#ffcc00',Airtel:'#ff3300',Glo:'#00a000','9mobile':'#048296'};
            return `<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:14px;font-weight:600;">${n?.emoji||''} ${net}</span><span style="font-size:14px;color:var(--text-muted);">${count}</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:0%;background:${colors[net]||'var(--green)'};" data-width="${pct}"></div></div></div>`;
          }).join('')}
        </div>
        <div class="card"><div class="section-title">FRAUD TYPES</div>
          ${Object.entries(typeDist).map(([type, count]) => {
            const pct = a.total > 0 ? Math.round((count / a.total) * 100) : 0;
            const t = FRAUD_TYPES.find(x => x.id === type);
            return `<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:13px;font-weight:600;">${t?.icon||''} ${typeLabels[type]||type}</span><span style="font-size:13px;color:var(--text-muted);">${pct}%</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:0%;background:var(--red);" data-width="${pct}"></div></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div class="section-title" style="margin-bottom:0;">🚨 TOP FLAGGED IDENTITIES</div><button class="btn btn-ghost btn-sm" onclick="Admin.showTab('flagged')">View All →</button></div>
        ${(a.flagged||[]).slice(0,3).map(f=>renderFlaggedRow(f)).join('')||'<div class="empty-state"><p>No flagged identities yet.</p></div>'}
      </div>`;
  }

  // ── Flagged Tab ───────────────────────────────────────────────
  function renderFlaggedTab(flagged) {
    if (!flagged.length) return `<div class="page-header"><h2 style="font-size:20px;font-weight:800;">🚩 Flagged Identities</h2></div><div class="empty-state"><div class="empty-icon">✅</div><p>No suspicious patterns detected yet.</p></div>`;
    return `<div class="page-header"><h2 style="font-size:20px;font-weight:800;">🚩 Flagged Identities</h2><p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Identities with multiple fraud reports — ranked by risk score</p></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${flagged.map(f=>`<div class="card fade-in">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
            <div><div style="font-size:17px;font-weight:700;">${f.name}</div><div style="font-size:13px;color:var(--text-muted);margin-top:3px;">${f.phone}</div></div>
            <div style="text-align:right;"><div style="font-size:24px;font-weight:900;color:${f.band.color};">${f.score}</div><div class="badge badge-red">${f.band.emoji} ${f.band.label}</div></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <span class="badge badge-red">${f.reportCount} Reports</span>
            ${f.networks.map(n=>`<span class="badge badge-blue">${NETWORKS.find(x=>x.id===n)?.emoji||''} ${n}</span>`).join('')}
            ${f.states.map(s=>`<span class="badge badge-amber">📍 ${s}</span>`).join('')}
          </div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" data-width="${f.score}" style="width:0%;background:${f.band.color};"></div></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Last activity: ${Reports.formatTimeAgo(f.lastSeen)}</div>
        </div>`).join('')}
      </div>`;
  }

  // ── Heatmap Tab ───────────────────────────────────────────────
  function renderHeatmapTab(heatmap) {
    const maxCount = heatmap[0]?.[1] || 1;
    const heatColors = ['#ff3366','#ff6b35','#ffb800','#00d4aa','#00ff88'];
    return `<div class="page-header"><h2 style="font-size:20px;font-weight:800;">🗺️ Fraud Heatmap</h2><p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Geographic distribution of fraud reports across Nigeria</p></div>
      <div class="card fade-in" style="margin-bottom:20px;"><div class="section-title">REPORT DENSITY BY STATE</div>
        ${heatmap.map(([state, count], i) => {
          const pct = Math.round((count / maxCount) * 100);
          const color = heatColors[Math.min(Math.floor((1 - pct/100) * (heatColors.length - 1)), heatColors.length-1)];
          return `<div class="heatmap-row"><div class="heatmap-state"><span style="font-weight:700;font-size:14px;">#${i+1}</span><span style="margin-left:8px;">${state}</span></div>
            <div class="heatmap-bar-wrap"><div class="progress-bar-wrap"><div class="progress-bar-fill" data-width="${pct}" style="width:0%;background:${color};"></div></div></div>
            <div class="heatmap-count">${count}</div><span class="badge" style="background:${color}22;color:${color};border-color:${color}44;font-size:11px;">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
      <div class="card fade-in"><div class="section-title">FRAUD INTENSITY LEGEND</div><div style="display:flex;gap:14px;flex-wrap:wrap;">
        ${[{label:'Critical',color:'#ff3366'},{label:'High',color:'#ff6b35'},{label:'Moderate',color:'#ffb800'},{label:'Low',color:'#00d4aa'},{label:'Minimal',color:'#00ff88'}].map(l=>`<div style="display:flex;align-items:center;gap:8px;"><div style="width:14px;height:14px;border-radius:4px;background:${l.color};"></div><span style="font-size:13px;color:var(--text-secondary);">${l.label}</span></div>`).join('')}
      </div></div>`;
  }

  // ── All Reports Tab ───────────────────────────────────────────
  function renderAllReportsTab(reports) {
    return `<div class="page-header"><h2 style="font-size:20px;font-weight:800;">📋 All Reports</h2><p style="color:var(--text-muted);font-size:14px;margin-top:4px;">${reports.length} total reports in the system</p></div>
      <div class="table-wrap card" style="padding:0;"><table><thead><tr><th>Phone</th><th>Network</th><th>Type</th><th>State</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>${reports.map(r => {
        const net = NETWORKS.find(n => n.id === r.network);
        const ft  = FRAUD_TYPES.find(t => t.id === r.type);
        const sc  = {pending:'amber',investigating:'blue',verified:'green',closed:'muted'}[r.status]||'muted';
        return `<tr><td style="font-weight:600;font-family:monospace;">${r.phone}</td><td>${net?.emoji||''} ${net?.label||r.network}</td><td><span style="font-size:13px;">${ft?.icon||''} ${ft?.label||r.type}</span></td><td><span class="badge badge-blue" style="font-size:11px;">📍 ${r.state}</span></td><td><span class="badge badge-${sc}" style="text-transform:capitalize;">${r.status}</span></td><td style="color:var(--text-muted);font-size:12px;">${Reports.formatTimeAgo(r.timestamp)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function renderFlaggedRow(f) {
    return `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;"><div style="font-weight:700;font-size:15px;">${f.name}</div><div style="font-size:12px;color:var(--text-muted);">${f.phone} • ${f.states.join(', ')}</div></div>
      <span class="badge badge-red">${f.reportCount} reports</span>
      <div style="text-align:right;min-width:48px;"><div style="font-size:20px;font-weight:900;color:${f.band.color};">${f.score}</div><div style="font-size:11px;color:var(--text-muted);">score</div></div>
    </div>`;
  }

  async function showTab(tab) {
    activeTab = tab;
    ['overview','flagged','heatmap','reports'].forEach(t => {
      const btn = document.getElementById(`anav-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const content = document.getElementById('admin-main-content');
    if (!content) return;
    content.innerHTML = `<div style="display:flex;justify-content:center;padding:60px;"><div style="width:40px;height:40px;border:3px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>`;

    try {
      switch (tab) {
        case 'overview': {
          const [statsRes, heatmapRes, flaggedRes] = await Promise.all([Api.get('/admin/analytics'), Api.get('/admin/heatmap'), Api.get('/admin/flagged')]);
          _analysis = { total: statsRes.stats.total, pending: statsRes.stats.pending, verified: statsRes.stats.verified, today: statsRes.stats.today, networkMap: heatmapRes.networkMap, typeMap: heatmapRes.typeMap, heatmap: heatmapRes.heatmap, flagged: flaggedRes.flagged };
          content.innerHTML = renderOverview(_analysis); break;
        }
        case 'flagged': {
          const res = await Api.get('/admin/flagged');
          content.innerHTML = renderFlaggedTab(res.flagged); break;
        }
        case 'heatmap': {
          const res = await Api.get('/admin/heatmap');
          content.innerHTML = renderHeatmapTab(res.heatmap); break;
        }
        case 'reports': {
          const res = await Api.get('/admin/reports');
          content.innerHTML = renderAllReportsTab(res.reports); break;
        }
      }
      animateBars();
    } catch (err) {
      content.innerHTML = `<div class="alert alert-warning" style="margin:24px;"><span class="alert-icon">⚠️</span><span>${err.message}</span></div>`;
    }
  }

  return { renderAdminView, showTab };
})();

window.Admin = Admin;
