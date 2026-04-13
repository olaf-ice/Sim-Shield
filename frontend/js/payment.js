// ============================================================
// payment.js — SimShield Pro: 1-Week Trial + ₦2,000/6 Months
// ============================================================

const Payment = (() => {

  let activeMethod = null;
  let _reference   = null;

  // ── Render full payment view ───────────────────────────────
  async function renderPaymentView() {
    activeMethod = null; _reference = null;
    const el = document.getElementById('view-payment');
    el.innerHTML = buildShell();
    injectStyles();

    try {
      const status = await Api.get('/payment/status');

      // Already subscribed — bounce to dashboard
      if (status.subscriptionActive) {
        const user = Auth.currentUser();
        if (user) { user.hasAccess = true; user.subscriptionActive = true; Api.setUser(user); }
        App.navigate('dashboard'); return;
      }

      // Trial still running — bounce to dashboard
      if (status.trialActive) {
        const user = Auth.currentUser();
        if (user) { user.hasAccess = true; user.trialActive = true; Api.setUser(user); }
        App.navigate('dashboard'); return;
      }

      // Trial expired or never started — show paywall
      const details = await Api.post('/payment/initiate', {});
      _reference = details.reference;
      renderExpiredStage(status, details);

    } catch (err) {
      document.getElementById('pay-container').innerHTML =
        `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>${err.message}</span></div>`;
    }
  }

  function buildShell() {
    return `<nav class="navbar"><a href="#" class="navbar-brand"><div class="brand-icon">🛡️</div><span class="brand-name">Sim<span>Shield</span></span></a>
      <div class="navbar-actions"><button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Sign Out</button></div></nav>
      <div class="page-container" style="max-width:520px;" id="pay-container"></div>`;
  }

  // ── Trial Expired / Subscribe Stage ───────────────────────
  function renderExpiredStage(status, details) {
    const trialEnded = status.trialExpiresAt
      ? `Your 7-day free trial ended on <strong>${new Date(status.trialExpiresAt).toLocaleDateString('en-NG')}</strong>.`
      : 'Your free trial has ended.';

    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in">
        <!-- Header -->
        <div style="text-align:center;padding:8px 0 28px;">
          <div style="width:72px;height:72px;background:linear-gradient(135deg,var(--green),#00b8ff);border-radius:22px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:34px;box-shadow:var(--shadow-green);">🛡️</div>
          <h1 style="font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:10px;">Your Free Trial Has Ended</h1>
          <p style="color:var(--text-secondary);font-size:14px;line-height:1.7;max-width:360px;margin:0 auto;">${trialEnded} Subscribe to keep your full access to fraud intelligence.</p>
        </div>

        <!-- Plan Card -->
        <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,rgba(0,255,136,0.07),rgba(0,184,255,0.05));border-color:var(--border-active);text-align:center;padding:28px 24px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">SIMSHIELD PRO — 6 MONTHS</div>
          <div style="display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:6px;">
            <span style="font-size:22px;font-weight:700;color:var(--green);">₦</span>
            <span style="font-size:58px;font-weight:900;color:var(--green);letter-spacing:-3px;line-height:1;">2,000</span>
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:18px;">Valid for <strong style="color:var(--text-primary);">6 months</strong> · That's just ₦333/month</div>
          <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
            ${[
              ['📊','Full SIM Identity Risk Score (0–100)'],
              ['⚠️','Detailed Risk Breakdown & Fraud Signals'],
              ['🔔','Real-Time Security & Fraud Alerts'],
              ['📋','Full Report History Access'],
              ['🔄','Live Score Updates as reports come in'],
              ['🔐','MFA & Device Login Protection'],
            ].map(([icon, text]) => `<div style="display:flex;align-items:center;gap:10px;font-size:13px;"><span style="width:32px;height:32px;background:var(--green-dim);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</span><span>${text}</span></div>`).join('')}
          </div>
        </div>

        <!-- Trial reminder -->
        <div class="alert alert-info fade-in" style="margin-bottom:20px;">
          <span class="alert-icon">💡</span>
          <span>New users get a <strong>1-week free trial</strong> — no payment needed to start. After that, subscribe to keep access.</span>
        </div>

        <!-- Payment Methods -->
        <div class="section-title">CHOOSE PAYMENT METHOD</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;" class="fade-in">
          <button class="payment-method-btn" onclick="Payment.selectMethod('card')"><div class="pm-icon" style="background:rgba(79,142,247,0.15);">💳</div><div class="pm-info"><div class="pm-title">Debit / Credit Card</div><div class="pm-sub">Visa, Mastercard, Verve — instant</div></div><div class="pm-badge" style="color:var(--green);">Recommended</div><div class="pm-arrow">›</div></button>
          <button class="payment-method-btn" onclick="Payment.selectMethod('transfer')"><div class="pm-icon" style="background:rgba(255,184,0,0.15);">🏦</div><div class="pm-info"><div class="pm-title">Bank Transfer</div><div class="pm-sub">Transfer ₦2,000 to our GTB account</div></div><div class="pm-arrow">›</div></button>
          <button class="payment-method-btn" onclick="Payment.selectMethod('ussd')"><div class="pm-icon" style="background:rgba(255,107,53,0.15);">📲</div><div class="pm-info"><div class="pm-title">USSD Code</div><div class="pm-sub">Dial from any phone — no internet needed</div></div><div class="pm-arrow">›</div></button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;padding-bottom:80px;"><span style="font-size:18px;">🔒</span><span style="font-size:12px;color:var(--text-muted);">256-bit SSL encrypted · Powered by Paystack</span></div>
      </div>`;
  }

  // ── Card Stage ─────────────────────────────────────────────
  function renderCardStage() {
    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
          <button onclick="Payment._backToPaywall()" style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text-primary);display:flex;align-items:center;justify-content:center;">←</button>
          <div><h2 style="font-size:20px;font-weight:800;">Card Payment</h2><div style="font-size:13px;color:var(--text-muted);">Secured by Paystack · ₦2,000 / 6 months</div></div>
        </div>
        <div style="background:linear-gradient(135deg,#1a2550,#0a1428);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:24px 22px;margin-bottom:28px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;"><div style="width:42px;height:30px;background:linear-gradient(135deg,#ffcc00,#ff9900);border-radius:6px;"></div><div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.5);">SimShield Pro</div></div>
          <div style="font-size:20px;font-weight:700;letter-spacing:4px;color:white;margin-bottom:24px;font-family:'Courier New',monospace;" id="card-preview-number">•••• •••• •••• ••••</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <div><div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Card Holder</div><div style="font-size:14px;font-weight:700;text-transform:uppercase;" id="card-preview-name">FULL NAME</div></div>
            <div><div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Expires</div><div style="font-size:14px;font-weight:700;" id="card-preview-expiry">MM/YY</div></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:20px;padding:24px;">
          <div class="form-group"><label class="form-label">Card Number</label><input id="card-number" class="form-input card-number-input" type="text" maxlength="19" placeholder="0000  0000  0000  0000" oninput="Payment.formatCardNumber(this)" autocomplete="cc-number"/></div>
          <div class="form-group"><label class="form-label">Cardholder Name</label><input id="card-name" class="form-input" type="text" placeholder="As printed on card" oninput="Payment.updateCardPreview()" autocomplete="cc-name" style="text-transform:uppercase;"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">Expiry Date</label><input id="card-expiry" class="form-input" type="text" maxlength="5" placeholder="MM/YY" oninput="Payment.formatExpiry(this)"/></div>
            <div class="form-group" style="margin-bottom:0;"><label class="form-label">CVV</label><div style="position:relative;"><input id="card-cvv" class="form-input" type="password" maxlength="3" placeholder="•••"/><span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:16px;cursor:pointer;" onclick="Payment.toggleCvv()">👁️</span></div></div>
          </div>
        </div>
        <div class="payment-timer"><span>⏳</span><span>Complete payment within</span><span class="timer-count" id="card-timer-display">10:00</span></div>
        <button class="btn btn-primary btn-full btn-lg" onclick="Payment.processCard()" style="margin-bottom:16px;">🔒 Pay ₦2,000 Now</button>
        <div style="text-align:center;font-size:12px;color:var(--text-muted);padding-bottom:80px;">Your card details are encrypted and never stored on our servers</div>
      </div>`;
    startTimer('card-timer-display', 600);
  }

  // ── Transfer Stage ─────────────────────────────────────────
  function renderTransferStage() {
    const ref = _reference || 'SS-DEMO';
    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
          <button onclick="Payment._backToPaywall()" style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text-primary);display:flex;align-items:center;justify-content:center;">←</button>
          <div><h2 style="font-size:20px;font-weight:800;">Bank Transfer</h2><div style="font-size:13px;color:var(--text-muted);">Transfer exactly ₦2,000 to the account below</div></div>
        </div>
        <div class="alert alert-warning fade-in" style="margin-bottom:20px;"><span class="alert-icon">⚠️</span><span>Transfer <strong>exactly ₦2,000</strong>. Wrong amounts cannot be matched to your account.</span></div>
        <div class="account-box fade-in">
          <div style="font-size:12px;font-weight:700;color:var(--amber);letter-spacing:1px;margin-bottom:14px;text-transform:uppercase;">TRANSFER TO THIS ACCOUNT</div>
          <div class="account-row"><div><div class="account-label">Bank</div><div class="account-value">Guaranty Trust Bank (GTB)</div></div></div>
          <div class="account-row"><div><div class="account-label">Account Number</div><div class="account-value" style="font-family:monospace;font-size:20px;letter-spacing:2px;color:var(--green);">0123456789</div></div><button class="copy-btn" onclick="Payment.copyToClipboard('0123456789','Account number')">📋</button></div>
          <div class="account-row"><div><div class="account-label">Account Name</div><div class="account-value">SimShield Technologies Ltd</div></div></div>
          <div class="account-row"><div><div class="account-label">Amount</div><div class="account-value" style="color:var(--green);font-size:22px;">₦2,000.00</div></div><button class="copy-btn" onclick="Payment.copyToClipboard('2000','Amount')">📋</button></div>
        </div>
        <div class="card fade-in" style="margin-bottom:20px;"><div class="section-title">YOUR PAYMENT REFERENCE</div>
          <div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-family:monospace;font-size:18px;font-weight:900;color:var(--blue);letter-spacing:2px;" id="pay-ref">${ref}</div><button class="copy-btn" onclick="Payment.copyRef()">📋</button></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Add this as your transfer narration/remark to help us match your payment faster.</div>
        </div>
        <div class="payment-timer" style="margin-bottom:20px;"><span>⏳</span><span>Payment expires in</span><span class="timer-count" id="transfer-timer-display">30:00</span></div>
        <button class="btn btn-primary btn-full btn-lg" onclick="Payment.confirmTransfer()" style="margin-bottom:12px;">✅ I Have Transferred ₦2,000</button>
        <button class="btn btn-ghost btn-full btn-sm" onclick="Payment._backToPaywall()" style="margin-bottom:80px;">Choose Another Method</button>
      </div>`;
    startTimer('transfer-timer-display', 1800);
  }

  // ── USSD Stage ─────────────────────────────────────────────
  function renderUSSDStage() {
    const USSD_CODES = { GTB:'*737*2*2000*5678901#', Access:'*901*000*2000*5678901#', UBA:'*919*3*2000*5678901#', Zenith:'*966*2000*5678901#' };
    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
          <button onclick="Payment._backToPaywall()" style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text-primary);display:flex;align-items:center;justify-content:center;">←</button>
          <div><h2 style="font-size:20px;font-weight:800;">USSD Payment</h2><div style="font-size:13px;color:var(--text-muted);">No internet needed — dial from any phone</div></div>
        </div>
        <div class="alert alert-info fade-in" style="margin-bottom:24px;"><span class="alert-icon">📲</span><span>Select your bank and dial the USSD code from the phone number you registered with.</span></div>
        <div class="section-title">YOUR BANK</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;" class="fade-in">
          ${Object.keys(USSD_CODES).map(bank=>`<button class="network-btn" data-ussd-bank="${bank}" onclick="Payment.selectUSSDBank('${bank}','${USSD_CODES[bank]}')" style="flex-direction:column;gap:4px;padding:14px;"><span style="font-size:22px;">${{GTB:'🟢',Access:'💎',UBA:'🔴',Zenith:'🔵'}[bank]}</span><span>${bank}</span></button>`).join('')}
        </div>
        <div id="ussd-code-display" style="display:none;" class="fade-in">
          <div class="section-title">DIAL THIS CODE</div>
          <div class="ussd-code" id="ussd-code-text"></div>
          <div style="display:flex;gap:10px;margin-bottom:20px;">
            <button class="btn btn-ghost" style="flex:1;" onclick="Payment.copyUSSD()">📋 Copy Code</button>
            <a id="ussd-tel-link" href="" class="btn btn-primary" style="flex:1;text-align:center;">📲 Dial Now</a>
          </div>
        </div>
        <div class="payment-timer" id="ussd-timer-wrap" style="display:none;"><span>⏳</span><span>Session expires in</span><span class="timer-count" id="ussd-timer-display">15:00</span></div>
        <div id="ussd-confirm-wrap" style="display:none;">
          <button class="btn btn-primary btn-full btn-lg" onclick="Payment.confirmUSSD()" style="margin-bottom:12px;">✅ I Have Dialled &amp; Paid</button>
          <button class="btn btn-ghost btn-full btn-sm" onclick="Payment._backToPaywall()" style="margin-bottom:80px;">Choose Another Method</button>
        </div>
      </div>`;
  }

  // ── Processing ─────────────────────────────────────────────
  function renderProcessingStage(message = 'Processing your payment...') {
    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in" style="text-align:center;padding:60px 20px;">
        <div class="processing-ring"></div>
        <h2 style="font-size:22px;font-weight:800;margin-bottom:10px;">${message}</h2>
        <p style="color:var(--text-secondary);font-size:14px;">Please wait, do not close this page.</p>
        <div style="margin-top:40px;display:flex;flex-direction:column;gap:10px;max-width:300px;margin-left:auto;margin-right:auto;">
          ${[['Connecting to Paystack...',true],['Verifying transaction...',false],['Activating 6-month access...',false]].map(([text,done],i)=>`<div style="display:flex;align-items:center;gap:10px;opacity:${done?1:0.35};transition:opacity 0.5s ${i*0.8}s;" class="proc-step-${i}"><span style="font-size:16px;">${done?'✅':'⏳'}</span><span style="font-size:13px;color:var(--text-secondary);">${text}</span></div>`).join('')}
        </div>
      </div>`;
    const c = document.getElementById('pay-container');
    [1200, 2200].forEach((t, i) => setTimeout(() => { const el = c.querySelector(`.proc-step-${i+1}`); if (el) { el.style.opacity='1'; el.querySelector('span').textContent='✅'; } }, t));
  }

  // ── Success Stage ──────────────────────────────────────────
  function renderSuccessStage(ref, expiresAt) {
    const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' }) : '6 months from today';
    document.getElementById('pay-container').innerHTML = `
      <div class="fade-in confetti-wrap" style="text-align:center;padding:40px 20px;" id="success-stage">
        <div class="success-circle">✓</div>
        <h1 style="font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:10px;color:var(--green);">Payment Successful!</h1>
        <p style="color:var(--text-secondary);font-size:15px;margin-bottom:28px;line-height:1.7;">SimShield Pro is now active.<br/>You're protected until <strong style="color:var(--text-primary);">${expiry}</strong>.</p>
        <div class="card" style="text-align:left;margin-bottom:28px;padding:20px;"><div class="section-title" style="margin-bottom:14px;">PAYMENT RECEIPT</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-muted);font-size:13px;">Plan</span><span style="font-weight:800;color:var(--green);">SimShield Pro · 6 Months</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-muted);font-size:13px;">Amount Paid</span><span style="font-weight:800;color:var(--green);">₦2,000.00</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-muted);font-size:13px;">Reference</span><span style="font-weight:700;font-family:monospace;font-size:13px;color:var(--blue);">${ref}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:var(--text-muted);font-size:13px;">Valid Until</span><span style="font-weight:600;font-size:13px;">${expiry}</span></div>
          </div>
        </div>
        <div class="alert alert-success" style="text-align:left;margin-bottom:28px;"><span class="alert-icon">🛡️</span><div><strong>6 Months of Full Protection Active</strong><br/><span style="font-size:13px;margin-top:4px;display:block;">You now have full access to real-time fraud intelligence until ${expiry}.</span></div></div>
        <button class="btn btn-primary btn-full btn-lg" onclick="Payment.goToDashboard()" style="margin-bottom:80px;">🚀 View My Risk Score →</button>
      </div>`;
    spawnConfetti();
  }

  function spawnConfetti() {
    const wrap = document.getElementById('success-stage'); if (!wrap) return;
    const colors = ['#00ff88','#ffb800','#ff3366','#4f8ef7','#ff6b35'];
    for (let i = 0; i < 20; i++) { setTimeout(() => { const dot = document.createElement('div'); dot.className='confetti-dot'; dot.style.cssText=`left:${Math.random()*100}%;top:0;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*0.5}s;animation-duration:${0.8+Math.random()*0.8}s;`; wrap.appendChild(dot); setTimeout(()=>dot.remove(),2000); }, i*50); }
  }

  // ── Card helpers ───────────────────────────────────────────
  function formatCardNumber(input) {
    let val = input.value.replace(/\D/g,'').slice(0,16);
    val = val.replace(/(\d{4})(?=\d)/g,'$1 ').trim();
    input.value = val;
    const preview = document.getElementById('card-preview-number');
    if (preview) { const raw=val.replace(/\s/g,''); let d=''; for(let i=0;i<4;i++){const c=raw.slice(i*4,i*4+4)||'••••';d+=(i>0?' ':'')+c.padEnd(4,'•');} preview.textContent=d; }
  }
  function formatExpiry(input) { let v=input.value.replace(/\D/g,'').slice(0,4); if(v.length>=2)v=v.slice(0,2)+'/'+v.slice(2); input.value=v; const p=document.getElementById('card-preview-expiry'); if(p)p.textContent=v||'MM/YY'; }
  function updateCardPreview() { const n=document.getElementById('card-name'); const p=document.getElementById('card-preview-name'); if(n&&p)p.textContent=n.value.toUpperCase()||'FULL NAME'; }
  function toggleCvv() { const c=document.getElementById('card-cvv'); if(c)c.type=c.type==='password'?'text':'password'; }

  async function processCard() {
    const num=document.getElementById('card-number')?.value.replace(/\s/g,'');
    const name=document.getElementById('card-name')?.value.trim();
    const exp=document.getElementById('card-expiry')?.value;
    const cvv=document.getElementById('card-cvv')?.value;
    if(!num||num.length<13){Toast.show('Enter a valid card number','error');return;}
    if(!name){Toast.show('Enter the cardholder name','error');return;}
    if(!exp||exp.length<5){Toast.show('Enter a valid expiry date','error');return;}
    if(!cvv||cvv.length<3){Toast.show('Enter the 3-digit CVV','error');return;}
    renderProcessingStage('Charging your card...');
    setTimeout(()=>verifyPayment(),3200);
  }

  function copyToClipboard(text, label) { navigator.clipboard?.writeText(text).catch(()=>{}); Toast.show(`${label} copied!`,'success'); }
  function copyRef() { const r=document.getElementById('pay-ref')?.textContent; if(r)copyToClipboard(r,'Reference'); }

  function confirmTransfer() {
    renderProcessingStage('Verifying your transfer...');
    setTimeout(()=>verifyPayment(),3500);
  }

  let _selectedUSSDCode = '';
  function selectUSSDBank(bank, code) {
    _selectedUSSDCode = code;
    document.querySelectorAll('[data-ussd-bank]').forEach(b=>b.classList.toggle('selected',b.dataset.ussdBank===bank));
    const disp=document.getElementById('ussd-code-display'); const ct=document.getElementById('ussd-code-text'); const tl=document.getElementById('ussd-tel-link'); const tw=document.getElementById('ussd-timer-wrap'); const cw=document.getElementById('ussd-confirm-wrap');
    if(disp)disp.style.display='block'; if(ct)ct.textContent=code; if(tl)tl.href='tel:'+code; if(tw)tw.style.display='flex'; if(cw)cw.style.display='block';
    startTimer('ussd-timer-display',900);
  }
  function copyUSSD() { if(_selectedUSSDCode)copyToClipboard(_selectedUSSDCode,'USSD code'); }
  function confirmUSSD() { renderProcessingStage('Confirming USSD payment...'); setTimeout(()=>verifyPayment(),4000); }

  async function verifyPayment() {
    try {
      const data = await Api.post('/payment/verify', { reference: _reference });
      // Update cached user
      const user = Auth.currentUser();
      if (user) {
        user.hasAccess           = true;
        user.subscriptionActive  = true;
        user.reportUnlocked      = true;
        user.subscriptionExpiresAt = data.subscriptionExpiresAt;
        user.paymentRef          = data.reference;
        Api.setUser(user);
      }
      renderSuccessStage(data.reference, data.subscriptionExpiresAt);
    } catch (err) {
      Toast.show(err.message, 'error');
      _backToPaywall();
    }
  }

  async function _backToPaywall() {
    stopAllTimers();
    try {
      const [status, details] = await Promise.all([
        Api.get('/payment/status'),
        Api.post('/payment/initiate', {}),
      ]);
      _reference = details.reference;
      renderExpiredStage(status, details);
    } catch(e) { renderPaymentView(); }
  }

  function selectMethod(method) {
    activeMethod = method;
    switch (method) {
      case 'card':     renderCardStage();     break;
      case 'transfer': renderTransferStage(); break;
      case 'ussd':     renderUSSDStage();     break;
    }
  }

  function goToDashboard() { App.navigate('dashboard'); }

  let timerInterval = null;
  function startTimer(elId, seconds) {
    stopAllTimers(); let remaining = seconds;
    timerInterval = setInterval(() => {
      remaining--;
      const el = document.getElementById(elId);
      if (el) el.textContent = `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
      if (remaining <= 0) { stopAllTimers(); Toast.show('Payment session expired. Please start again.','warning'); _backToPaywall(); }
    }, 1000);
  }
  function stopAllTimers() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  function injectStyles() {
    if (document.getElementById('payment-styles')) return;
    const st = document.createElement('style'); st.id = 'payment-styles';
    st.textContent = `.payment-method-btn{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;transition:var(--transition);width:100%;text-align:left;font-family:inherit;color:var(--text-primary);}.payment-method-btn:hover{border-color:var(--border-active);background:var(--bg-card-hover);transform:translateX(3px);}.pm-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}.pm-info{flex:1;}.pm-title{font-size:15px;font-weight:700;}.pm-sub{font-size:12px;color:var(--text-muted);margin-top:2px;}.pm-badge{font-size:11px;font-weight:700;}.pm-arrow{font-size:22px;color:var(--text-muted);}.card-number-input{font-family:'Courier New',monospace;letter-spacing:3px;font-size:18px;font-weight:700;}.processing-ring{width:80px;height:80px;border:4px solid rgba(0,255,136,0.2);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 24px;}.success-circle{width:90px;height:90px;background:var(--green-dim);border:2px solid var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 24px;animation:successPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275);}@keyframes successPop{0%{transform:scale(0);opacity:0;}60%{transform:scale(1.15);}100%{transform:scale(1);opacity:1;}}.confetti-wrap{position:relative;overflow:hidden;}.confetti-dot{position:absolute;width:8px;height:8px;border-radius:2px;animation:confettiFall 1s ease-in forwards;}@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1;}100%{transform:translateY(120px) rotate(360deg);opacity:0;}}.account-box{background:rgba(255,184,0,0.06);border:1px solid rgba(255,184,0,0.3);border-radius:var(--radius-md);padding:20px;margin-bottom:20px;}.account-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);}.account-row:last-child{border-bottom:none;}.account-label{font-size:12px;color:var(--text-muted);}.account-value{font-size:15px;font-weight:700;}.copy-btn{background:none;border:none;cursor:pointer;color:var(--green);font-size:16px;padding:4px;transition:var(--transition);}.copy-btn:hover{transform:scale(1.2);}.ussd-code{font-family:'Courier New',monospace;font-size:22px;font-weight:900;color:var(--green);background:var(--green-dim);border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius-md);padding:20px;text-align:center;letter-spacing:2px;margin:16px 0;}.payment-timer{display:flex;align-items:center;gap:8px;justify-content:center;font-size:13px;color:var(--amber);padding:10px 16px;background:var(--amber-dim);border:1px solid rgba(255,184,0,0.3);border-radius:var(--radius-sm);margin-bottom:20px;}.timer-count{font-weight:900;font-size:16px;}`;
    document.head.appendChild(st);
  }

  return {
    renderPaymentView, selectMethod, goToDashboard,
    formatCardNumber, formatExpiry, updateCardPreview, toggleCvv, processCard,
    copyToClipboard, copyRef, confirmTransfer,
    selectUSSDBank, copyUSSD, confirmUSSD,
    _backToPaywall,
  };
})();

window.Payment = Payment;
