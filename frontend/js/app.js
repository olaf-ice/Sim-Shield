// ============================================================
// app.js — Async router + Toast + Onboarding (API-powered)
// ============================================================

const Toast = (() => {
  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span style="font-size:18px;flex-shrink:0;">${icons[type]||'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(30px)'; toast.style.transition='all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
  }
  return { show };
})();

const App = (() => {
  const VIEWS = ['home','login','dashboard','declare','report','my-reports','admin','onboard','payment'];
  const PROTECTED = ['dashboard','declare','report','my-reports','admin','payment'];

  async function navigate(view) {
    // Auth guard
    if (PROTECTED.includes(view) && !Auth.isLoggedIn()) { navigate('login'); return; }

    // Payment gate — blocks dashboard if trial expired and not subscribed
    if (view === 'dashboard' && Auth.isLoggedIn()) {
      const user = Auth.currentUser();
      if (user && user.name && !user.hasAccess) { navigate('payment'); return; }
    }

    // Swap active view
    VIEWS.forEach(v => { const el = document.getElementById(`view-${v}`); if (el) el.classList.remove('active'); });
    const target = document.getElementById(`view-${view}`);
    if (!target) return;
    target.classList.add('active');

    // Render content
    switch (view) {
      case 'login':      Auth.renderLoginView();                break;
      case 'dashboard':  await Dashboard.renderUserDashboard(); break;
      case 'declare':    await Dashboard.renderDeclareView();   break;
      case 'report':     Reports.renderReportView();            break;
      case 'my-reports': await Reports.renderMyReportsView();   break;
      case 'admin':      await Admin.renderAdminView();         break;
      case 'onboard':    renderOnboarding();                    break;
      case 'payment':    await Payment.renderPaymentView();     break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.hash = view;
  }

  async function init() {
    const alreadyIn = await Auth.tryAutoLogin();
    const hash      = window.location.hash.replace('#', '') || 'home';
    const validHash = VIEWS.includes(hash) ? hash : 'home';
    bindLandingPage();
    if (alreadyIn && (validHash === 'home' || validHash === 'login')) {
      navigate('dashboard');
    } else {
      navigate(validHash);
    }
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (VIEWS.includes(h)) navigate(h);
    });
  }

  function bindLandingPage() {
    document.getElementById('view-home')?.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
  }

  return { navigate, init };
})();

// ── Onboarding ─────────────────────────────────────────────────
function renderOnboarding() {
  const el = document.getElementById('view-onboard');
  el.innerHTML = `
    <div class="auth-wrap"><div class="auth-card fade-in">
      <div class="auth-logo"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></div>
      <h1 class="auth-title">Set Up Your Profile</h1>
      <p class="auth-sub">Tell us a bit about yourself to personalize your risk assessment.</p>
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input id="onboard-name" class="form-input" type="text" placeholder="e.g. Emeka Okafor" autocomplete="name"/>
      </div>
      <div class="form-group">
        <label class="form-label">State of Residence</label>
        <select id="onboard-state" class="form-select">
          <option value="">Select your state...</option>
          ${NIGERIAN_STATES.map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin-bottom:28px;">
        <label class="form-label">How many SIM cards do you own?</label>
        <div class="count-selector">
          <button class="count-btn" onclick="adjustOnboardCount(-1)">−</button>
          <div class="count-display" id="onboard-count-display">1</div>
          <button class="count-btn" onclick="adjustOnboardCount(1)">+</button>
        </div>
      </div>
      <button class="btn btn-primary btn-full btn-lg" onclick="saveOnboarding()">Complete Setup →</button>
    </div></div>`;
  window._onboardCount = 1;
}

function adjustOnboardCount(delta) {
  window._onboardCount = Math.max(0, Math.min(4, (window._onboardCount || 1) + delta));
  const d = document.getElementById('onboard-count-display');
  if (d) d.textContent = window._onboardCount;
}

async function saveOnboarding() {
  const name  = document.getElementById('onboard-name').value.trim();
  const state = document.getElementById('onboard-state').value;
  if (!name)  { Toast.show('Please enter your full name', 'error');  return; }
  if (!state) { Toast.show('Please select your state',   'error'); return; }

  try {
    const data = await Api.put('/users/profile', { name, state, simCount: window._onboardCount || 1 });
    Api.setUser(data.user);
    Toast.show('Profile saved! Welcome to SimShield 🛡️', 'success');
    App.navigate('dashboard');
  } catch (err) {
    Toast.show(err.message, 'error');
  }
}

// ── Boot ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => App.init());
