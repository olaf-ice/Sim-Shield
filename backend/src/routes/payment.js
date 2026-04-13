const express  = require('express');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

const PLAN = {
  name:     'SimShield Pro (6 Months)',
  amount:   2000,
  currency: 'NGN',
  months:   6,
};

const BANK_DETAILS = {
  bank:        'Guaranty Trust Bank (GTB)',
  account:     '0123456789',
  accountName: 'SimShield Technologies Ltd',
  amount:      PLAN.amount,
  currency:    'NGN',
};

const USSD_CODES = {
  GTB:    '*737*2*2000*5678901#',
  Access: '*901*000*2000*5678901#',
  UBA:    '*919*3*2000*5678901#',
  Zenith: '*966*2000*5678901#',
};

// ── GET /api/payment/status ────────────────────────────────────
router.get('/status', authenticate, (req, res) => {
  const user = req.user;
  res.json({
    success:              true,
    hasAccess:            user.hasAccess(),
    trialActive:          user.isTrialActive(),
    subscriptionActive:   user.isSubscriptionActive(),
    trialExpiresAt:       user.trialExpiresAt  || null,
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    paymentRef:           user.paymentRef || null,
    daysLeft:             user.toProfile().daysLeft,
    // Legacy
    paid: user.isSubscriptionActive(),
  });
});

// ── POST /api/payment/initiate ─────────────────────────────────
router.post('/initiate', authenticate, (req, res) => {
  if (req.user.isSubscriptionActive()) {
    return res.json({
      success:    true,
      alreadyPaid: true,
      subscriptionExpiresAt: req.user.subscriptionExpiresAt,
    });
  }

  const reference = 'SS-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  res.json({
    success:   true,
    reference,
    plan:      PLAN,
    bank:      BANK_DETAILS,
    ussd:      USSD_CODES,
  });
});

// ── POST /api/payment/verify ───────────────────────────────────
// Demo: always succeeds. Production: call Paystack /transaction/verify/:reference
router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const { reference } = req.body;
    const ref = reference || ('SS-' + Math.random().toString(36).substr(2, 8).toUpperCase());

    const now   = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + PLAN.months); // +6 months

    req.user.subscriptionStartedAt = now;
    req.user.subscriptionExpiresAt = expiry;
    req.user.paymentRef            = ref;
    await req.user.save();

    res.json({
      success:              true,
      message:              'Payment verified. SimShield Pro unlocked for 6 months!',
      reference:            ref,
      subscriptionExpiresAt: expiry,
      user:                 req.user.toProfile(),
    });
  } catch (err) { next(err); }
});

module.exports = router;
