// ============================================================
// auth.js — JWT-based login + OTP flow (calls backend API)
// ============================================================

const Auth = (() => {

  let pendingPhone = '';

  // ── Session helpers ────────────────────────────────────────
  function currentUser()  { return Api.getUser(); }
  function isLoggedIn()   { return Api.isAuthenticated(); }
  function refreshSession() { /* handled server-side on every /auth/me call */ }

  async function tryAutoLogin() {
    if (!Api.getToken()) return false;
    try {
      const data = await Api.get('/auth/me');
      if (data.success) { Api.setUser(data.user); return true; }
    } catch { Api.clearAuth(); }
    return false;
  }

  function logout() {
    Api.clearAuth();
    App.navigate('home');
    Toast.show('You have been logged out. See you soon! 👋', 'info');
  }

  // ── Re-auth modal ──────────────────────────────────────────
  function requireReAuth(onConfirm, actionLabel = 'this action') {
    const user   = currentUser();
    if (!user) { App.navigate('login'); return; }
    const reOTP  = String(Math.floor(100000 + Math.random() * 900000));
    const overlay = document.createElement('div');
    overlay.id = 'reauth-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,11,26,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-active);border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;">
        <div style="font-size:36px;margin-bottom:14px;">🔐</div>
        <h2 style="font-size:20px;font-weight:900;margin-bottom:8px;">Confirm Your Identity</h2>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;line-height:1.6;">To <strong>${actionLabel}</strong>, verify it's you. Enter the OTP sent to <strong>${user.phone}</strong>.</p>
        <div class="alert alert-info" style="margin-bottom:20px;text-align:left;"><span class="alert-icon">💡</span><span><strong>Demo OTP:</strong> <strong>${reOTP}</strong></span></div>
        <div class="otp-container">${[0,1,2,3,4,5].map(i=>`<input class="otp-input" id="reauth-otp-${i}" maxlength="1" type="text" inputmode="numeric">`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:24px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('reauth-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" style="flex:1;" id="reauth-confirm-btn">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const inputs = overlay.querySelectorAll('.otp-input');
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g,'').slice(-1); if (inp.value && i < 5) inputs[i+1].focus(); });
      inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i-1].focus(); });
    });
    inputs[0].focus();
    overlay.querySelector('#reauth-confirm-btn').addEventListener('click', () => {
      const entered = [...inputs].map(i => i.value).join('');
      if (entered.length < 6) { Toast.show('Enter the complete 6-digit OTP', 'error'); return; }
      if (entered !== reOTP)  { Toast.show('Incorrect OTP. Try again.', 'error'); return; }
      overlay.remove(); onConfirm();
    });
  }

  // ── Render login view ──────────────────────────────────────
  function renderLoginView() {
    const el = document.getElementById('view-login');
    el.innerHTML = `
      <div class="auth-wrap"><div class="auth-card fade-in">
        <div class="auth-logo"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></div>
        <div id="auth-phone-step">
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-sub">Enter your Nigerian phone number to receive a verification code.</p>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <div class="input-group" style="position:relative;">
              <span class="input-prefix">🇳🇬 +234</span>
              <input id="auth-phone-input" class="form-input with-prefix" type="tel" maxlength="11" placeholder="08012345678" autocomplete="tel"/>
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-lg" id="auth-send-otp">Send Verification Code</button>
          <p style="margin-top:20px;font-size:13px;color:var(--text-muted);text-align:center;">New user? We'll create your account automatically.</p>
        </div>
        <div id="auth-otp-step" style="display:none;">
          <h1 class="auth-title">Enter OTP</h1>
          <p class="auth-sub" id="otp-sub-text">We sent a 6-digit code to <strong></strong></p>
          <div id="otp-demo-alert" class="alert alert-info" style="margin-bottom:20px;">
            <span class="alert-icon">💡</span>
            <span><strong>Demo Mode:</strong> Your OTP is <strong id="otp-preview"></strong></span>
          </div>
          <div class="otp-container" id="otp-container">
            ${[0,1,2,3,4,5].map(i=>`<input class="otp-input" maxlength="1" type="text" inputmode="numeric" id="otp-${i}">`).join('')}
          </div>
          <button class="btn btn-primary btn-full btn-lg" id="auth-verify-otp" style="margin-top:24px;">Verify & Continue</button>
          <button class="btn btn-ghost btn-full btn-sm" id="auth-back" style="margin-top:10px;">← Back</button>
        </div>
        <div id="auth-mfa-step" style="display:none;">
          <h1 class="auth-title">Two-Factor Auth</h1>
          <p class="auth-sub">Enter the 6-digit code from your Authenticator app.</p>
          <div class="otp-container" id="mfa-container">
            ${[0,1,2,3,4,5].map(i=>`<input class="otp-input mfa-input" maxlength="1" type="text" inputmode="numeric" id="mfa-totp-${i}">`).join('')}
          </div>
          <button class="btn btn-primary btn-full btn-lg" id="auth-verify-mfa" style="margin-top:24px;">Verify & Continue</button>
        </div>
      </div></div>`;

    document.getElementById('auth-send-otp').addEventListener('click', handleSendOTP);
    document.getElementById('auth-phone-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleSendOTP(); });
  }

  async function handleSendOTP() {
    const phone = document.getElementById('auth-phone-input').value.trim();
    if (!/^0[7-9][0-1]\d{8}$/.test(phone)) { Toast.show('Enter a valid Nigerian number (e.g. 08012345678)', 'error'); return; }
    pendingPhone = phone;
    const btn = document.getElementById('auth-send-otp');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const data = await Api.post('/auth/send-otp', { phone });
      document.getElementById('auth-phone-step').style.display = 'none';
      const otpStep = document.getElementById('auth-otp-step');
      otpStep.style.display = 'block';
      document.querySelector('#otp-sub-text strong').textContent = phone;
      document.getElementById('otp-preview').textContent = data.demo_otp;
      document.getElementById('otp-0').focus();
      bindOTPInputs();
      document.getElementById('auth-verify-otp').addEventListener('click', handleVerifyOTP);
      document.getElementById('auth-back').addEventListener('click', () => {
        document.getElementById('auth-phone-step').style.display = 'block';
        otpStep.style.display = 'none';
      });
      Toast.show(`OTP sent to ${phone}`, 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally { btn.disabled = false; btn.textContent = 'Send Verification Code'; }
  }

  function bindOTPInputs() {
    const inputs = document.querySelectorAll('#otp-container .otp-input');
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g,'').slice(-1);
        inp.classList.toggle('filled', !!inp.value);
        if (inp.value && i < inputs.length - 1) inputs[i+1].focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && i > 0) { inputs[i-1].focus(); inputs[i-1].classList.remove('filled'); }
        if (e.key === 'Enter') handleVerifyOTP();
      });
      inp.addEventListener('paste', e => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
        paste.split('').forEach((ch, idx) => { if (inputs[idx]) { inputs[idx].value = ch; inputs[idx].classList.add('filled'); } });
      });
    });
  }

  async function handleVerifyOTP() {
    const inputs  = document.querySelectorAll('#otp-container .otp-input');
    const entered = [...inputs].map(i => i.value).join('');
    if (entered.length < 6) { Toast.show('Please enter the complete 6-digit OTP', 'error'); return; }
    const btn = document.getElementById('auth-verify-otp');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const data = await Api.post('/auth/verify-otp', { phone: pendingPhone, otp: entered });
      if (data.mfaRequired) {
        document.getElementById('auth-otp-step').style.display = 'none';
        document.getElementById('auth-mfa-step').style.display = 'block';
        document.getElementById('mfa-totp-0').focus();
        bindMFAInputs();
        document.getElementById('auth-verify-mfa').addEventListener('click', handleVerifyMFA);
        btn.disabled = false; btn.textContent = 'Verify & Continue';
        return;
      }
      Api.setToken(data.token);
      Api.setUser(data.user);
      Toast.show('Welcome to SimShield! 🛡️', 'success');
      App.navigate(data.isNewUser || !data.user.name ? 'onboard' : 'dashboard');
    } catch (err) {
      Toast.show(err.message, 'error');
      inputs.forEach(i => i.classList.add('error'));
      btn.disabled = false; btn.textContent = 'Verify & Continue';
    }
  }

  function bindMFAInputs() {
    const inputs = document.querySelectorAll('#mfa-container .mfa-input');
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g,'').slice(-1);
        inp.classList.toggle('filled', !!inp.value);
        if (inp.value && i < inputs.length - 1) inputs[i+1].focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && i > 0) { inputs[i-1].focus(); inputs[i-1].classList.remove('filled'); }
        if (e.key === 'Enter') handleVerifyMFA();
      });
      inp.addEventListener('paste', e => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
        paste.split('').forEach((ch, idx) => { if (inputs[idx]) { inputs[idx].value = ch; inputs[idx].classList.add('filled'); } });
      });
    });
  }

  async function handleVerifyMFA() {
    const inputs  = document.querySelectorAll('#mfa-container .mfa-input');
    const entered = [...inputs].map(i => i.value).join('');
    if (entered.length < 6) { Toast.show('Please enter the 6-digit code', 'error'); return; }
    const btn = document.getElementById('auth-verify-mfa');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const data = await Api.post('/auth/mfa/verify-login', { phone: pendingPhone, token: entered });
      Api.setToken(data.token);
      Api.setUser(data.user);
      Toast.show('Verified! Welcome to SimShield 🛡️', 'success');
      App.navigate(data.isNewUser || !data.user.name ? 'onboard' : 'dashboard');
    } catch (err) {
      Toast.show(err.message, 'error');
      inputs.forEach(i => i.classList.add('error'));
    } finally {
      btn.disabled = false; btn.textContent = 'Verify & Continue';
    }
  }

  return { renderLoginView, currentUser, isLoggedIn, logout, tryAutoLogin, refreshSession, requireReAuth };
})();

window.Auth = Auth;
