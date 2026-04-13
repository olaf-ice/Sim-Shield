// ============================================================
// reports.js — Fraud reporting + My Reports (API-powered)
// ============================================================

const Reports = (() => {

  let selectedNetwork = '';
  let selectedType    = '';

  function renderReportView() {
    const el = document.getElementById('view-report');
    el.innerHTML = `
      <nav class="navbar"><a href="#" class="navbar-brand" onclick="App.navigate('dashboard')"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a>
        <div class="navbar-actions"><button class="btn btn-ghost btn-sm" onclick="App.navigate('dashboard')">← Back</button></div></nav>
      <div class="page-container">
        <div class="page-header"><h2>🚨 Report Fraud</h2><p>Report a SIM number that was registered without your consent or is being used fraudulently.</p></div>
        <div class="steps">
          <div class="step-item active" id="step-1-item"><div class="step-circle" id="sc-1">1</div><span class="step-label">Number</span></div>
          <div class="step-item" id="step-2-item"><div class="step-circle" id="sc-2">2</div><span class="step-label">Details</span></div>
          <div class="step-item" id="step-3-item"><div class="step-circle" id="sc-3">3</div><span class="step-label">Submit</span></div>
        </div>

        <!-- Step 1 -->
        <div id="report-step-1" class="fade-in">
          <div class="card" style="margin-bottom:20px;"><div class="form-group" style="margin-bottom:0">
            <label class="form-label">📞 Suspicious Phone Number</label>
            <div class="input-group" style="position:relative;"><span class="input-prefix">🇳🇬</span>
              <input id="report-phone" class="form-input with-prefix" type="tel" maxlength="11" placeholder="08012345678"/>
            </div><small style="color:var(--text-muted);font-size:12px;">Enter the Nigerian number you want to report</small>
          </div></div>
          <div class="card" style="margin-bottom:20px;"><label class="form-label" style="margin-bottom:14px;display:block;">📡 Select Network</label>
            <div class="network-grid" id="network-grid">
              ${NETWORKS.map(n=>`<button class="network-btn" data-network="${n.id}" onclick="Reports.selectNetwork('${n.id}')"><span class="network-emoji">${n.emoji}</span><span>${n.label}</span></button>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-lg" onclick="Reports.goStep2()">Continue →</button>
        </div>

        <!-- Step 2 -->
        <div id="report-step-2" style="display:none;" class="fade-in">
          <div class="card" style="margin-bottom:20px;"><label class="form-label" style="margin-bottom:14px;display:block;">🔍 Type of Fraud</label>
            <div style="display:flex;flex-direction:column;gap:10px;" id="fraud-type-list">
              ${FRAUD_TYPES.map(t=>`<button class="network-btn" data-type="${t.id}" onclick="Reports.selectType('${t.id}')" style="justify-content:flex-start;padding:14px 16px;"><span class="network-emoji">${t.icon}</span><span>${t.label}</span></button>`).join('')}
            </div>
          </div>
          <div class="card" style="margin-bottom:20px;">
            <div class="form-group" style="margin-bottom:16px;"><label class="form-label">📍 State Where Fraud Occurred</label>
              <select id="report-state" class="form-select"><option value="">Select a state...</option>${NIGERIAN_STATES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select>
            </div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">📝 Additional Details (Optional)</label>
              <textarea id="report-desc" class="form-textarea" placeholder="Describe what happened..."></textarea>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" onclick="Reports.goStep1()">← Back</button>
            <button class="btn btn-primary" style="flex:1;" onclick="Reports.goStep3()">Preview Report →</button>
          </div>
        </div>

        <!-- Step 3 -->
        <div id="report-step-3" style="display:none;" class="fade-in">
          <div class="card" style="margin-bottom:20px;"><h3 style="font-size:16px;font-weight:700;margin-bottom:18px;">📋 Review Your Report</h3><div id="report-preview"></div></div>
          <div class="alert alert-warning" style="margin-bottom:20px;"><span class="alert-icon">⚠️</span><span>By submitting, you confirm this report is accurate. False reports may result in account suspension.</span></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" onclick="Reports.goStep2Back()">← Back</button>
            <button class="btn btn-primary" style="flex:1;" id="submit-report-btn" onclick="Reports.submitReport()">🚨 Submit Report</button>
          </div>
        </div>
      </div>
      <div class="bottom-nav">
        <button class="bottom-nav-btn" onclick="App.navigate('dashboard')"><span class="nav-icon">📊</span><span>Dashboard</span></button>
        <button class="bottom-nav-btn active"><span class="nav-icon">🚨</span><span>Report</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('my-reports')"><span class="nav-icon">📋</span><span>My Reports</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('declare')"><span class="nav-icon">📱</span><span>My SIMs</span></button>
      </div>`;

    selectedNetwork = ''; selectedType = '';
  }

  function selectNetwork(id) {
    selectedNetwork = id;
    document.querySelectorAll('#network-grid .network-btn').forEach(b => b.classList.toggle('selected', b.dataset.network === id));
  }

  function selectType(id) {
    selectedType = id;
    document.querySelectorAll('#fraud-type-list .network-btn').forEach(b => b.classList.toggle('selected', b.dataset.type === id));
  }

  function goStep2() {
    const phone = document.getElementById('report-phone').value.trim();
    if (!/^0[7-9][0-1]\d{8}$/.test(phone)) { Toast.show('Enter a valid Nigerian number', 'error'); return; }
    if (!selectedNetwork) { Toast.show('Select a network provider', 'error'); return; }
    setStep(2);
  }

  function goStep1()    { setStep(1); }
  function goStep2Back(){ setStep(2); }

  function goStep3() {
    if (!selectedType) { Toast.show('Select the type of fraud', 'error'); return; }
    const state = document.getElementById('report-state').value;
    if (!state) { Toast.show('Select the state where fraud occurred', 'error'); return; }

    const phone = document.getElementById('report-phone').value.trim();
    const fraudTypeLabel = FRAUD_TYPES.find(t => t.id === selectedType)?.label || selectedType;
    const networkInfo    = NETWORKS.find(n => n.id === selectedNetwork);
    const desc           = document.getElementById('report-desc').value.trim();

    if (!document.getElementById('report-row-style')) {
      const st = document.createElement('style'); st.id = 'report-row-style';
      st.textContent = '.report-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);}';
      document.head.appendChild(st);
    }

    document.getElementById('report-preview').innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">
      <div class="report-row"><span style="color:var(--text-muted);font-size:13px;">Phone Number</span><strong style="font-size:15px;">${phone}</strong></div>
      <div class="report-row"><span style="color:var(--text-muted);font-size:13px;">Network</span><span class="badge badge-green">${networkInfo?.emoji} ${networkInfo?.label}</span></div>
      <div class="report-row"><span style="color:var(--text-muted);font-size:13px;">Fraud Type</span><strong>${fraudTypeLabel}</strong></div>
      <div class="report-row"><span style="color:var(--text-muted);font-size:13px;">State</span><strong>${state}</strong></div>
      ${desc?`<div class="report-row"><span style="color:var(--text-muted);font-size:13px;">Details</span><span style="font-size:14px;color:var(--text-secondary);">${desc}</span></div>`:''}
    </div>`;
    setStep(3);
  }

  function setStep(n) {
    [1,2,3].forEach(i => {
      document.getElementById(`report-step-${i}`).style.display = i === n ? 'block' : 'none';
      const sc = document.getElementById(`sc-${i}`);
      const si = document.getElementById(`step-${i}-item`);
      if (i < n) { sc.textContent = '✓'; si.classList.add('done'); si.classList.remove('active'); }
      else if (i === n) { si.classList.add('active'); si.classList.remove('done'); }
      else { si.classList.remove('active','done'); }
    });
  }

  async function submitReport() {
    const phone = document.getElementById('report-phone').value.trim();
    const state = document.getElementById('report-state').value;
    const desc  = document.getElementById('report-desc').value.trim();
    const btn   = document.getElementById('submit-report-btn');
    btn.disabled = true; btn.textContent = 'Submitting...';

    try {
      await Api.post('/reports', { phone, network: selectedNetwork, state, type: selectedType, description: desc });
      selectedNetwork = ''; selectedType = '';
      Toast.show('Report submitted successfully! Our team will investigate.', 'success');
      App.navigate('my-reports');
    } catch (err) {
      Toast.show(err.message, 'error');
      btn.disabled = false; btn.textContent = '🚨 Submit Report';
    }
  }

  // ── My Reports view ────────────────────────────────────────
  async function renderMyReportsView() {
    const el = document.getElementById('view-my-reports');
    el.innerHTML = `<nav class="navbar"><a href="#" class="navbar-brand" onclick="App.navigate('dashboard')"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a></nav>
      <div class="page-container"><div class="page-header"><h2>📋 My Reports</h2><p>Fraud reports you have submitted to SimShield</p></div>
      <div id="my-reports-list"><div style="display:flex;justify-content:center;padding:40px;"><div style="width:40px;height:40px;border:3px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div></div></div></div>
      <div class="bottom-nav">
        <button class="bottom-nav-btn" onclick="App.navigate('dashboard')"><span class="nav-icon">📊</span><span>Dashboard</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('report')"><span class="nav-icon">🚨</span><span>Report</span></button>
        <button class="bottom-nav-btn active"><span class="nav-icon">📋</span><span>My Reports</span></button>
        <button class="bottom-nav-btn" onclick="App.navigate('declare')"><span class="nav-icon">📱</span><span>My SIMs</span></button>
      </div>`;

    try {
      const data    = await Api.get('/reports/mine');
      const reports = data.reports || [];
      const listEl  = document.getElementById('my-reports-list');
      if (!reports.length) {
        listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>You haven't submitted any reports yet.</p><button class="btn btn-primary" style="margin-top:20px;" onclick="App.navigate('report')">🚨 Report a Number</button></div>`;
      } else {
        listEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">${reports.map(r=>renderReportCard(r)).join('')}</div>`;
      }
    } catch (err) {
      document.getElementById('my-reports-list').innerHTML = `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>${err.message}</span></div>`;
    }
  }

  function renderReportCard(r) {
    const fraudType = FRAUD_TYPES.find(t => t.id === r.type);
    const network   = NETWORKS.find(n => n.id === r.network);
    const sc = { pending:'amber', investigating:'blue', verified:'green', closed:'muted' }[r.status] || 'muted';
    return `<div class="card fade-in">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div><div style="font-size:17px;font-weight:700;">${r.phone}</div><div style="font-size:13px;color:var(--text-muted);margin-top:3px;">${network?.emoji||''} ${network?.label||r.network}</div></div>
        <span class="badge badge-${sc}" style="text-transform:capitalize;">${r.status}</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <span class="badge badge-amber">${fraudType?.icon||''} ${fraudType?.label||r.type}</span>
        <span class="badge badge-blue">📍 ${r.state}</span>
      </div>
      ${r.description?`<p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">${r.description}</p>`:''}
      <div style="font-size:12px;color:var(--text-muted);">⏱ ${formatTimeAgo(r.timestamp)}</div>
    </div>`;
  }

  function formatTimeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff/60000), hrs = Math.floor(diff/3600000), days = Math.floor(diff/86400000);
    if (days > 0) return `${days} day${days>1?'s':''} ago`;
    if (hrs  > 0) return `${hrs} hour${hrs>1?'s':''} ago`;
    if (mins > 0) return `${mins} minute${mins>1?'s':''} ago`;
    return 'Just now';
  }

  return { renderReportView, renderMyReportsView, selectNetwork, selectType, goStep2, goStep3, goStep1, goStep2Back, submitReport, formatTimeAgo };
})();

window.Reports = Reports;
