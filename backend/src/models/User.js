const mongoose = require('mongoose');

const SimSchema = new mongoose.Schema({
  network: { type: String, enum: ['MTN', 'Airtel', 'Glo', '9mobile'], required: true },
  number:  { type: String, default: '' },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  phone:               { type: String, required: true, unique: true, index: true },
  email:               { type: String, default: '' },
  name:                { type: String, default: '' },
  state:               { type: String, default: '' },
  simCount:            { type: Number, default: 0 },
  sims:                { type: [SimSchema], default: [] },
  verified:            { type: Boolean, default: false },
  lastVisit:           { type: Date, default: null },
  reportsMade:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
  mfaEnabled:          { type: Boolean, default: false },
  mfaSecret:           { type: String, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil:           { type: Date, default: null },
  joinedAt:            { type: Date, default: Date.now },

  // ── Trial & Subscription ──────────────────────────────────
  trialStartedAt:        { type: Date, default: null },
  trialExpiresAt:        { type: Date, default: null },
  subscriptionStartedAt: { type: Date, default: null },
  subscriptionExpiresAt: { type: Date, default: null },
  paymentRef:            { type: String, default: null },

  // ── Admin ─────────────────────────────────────────
  isAdmin:               { type: Boolean, default: false },
}, { timestamps: true });

// ── Computed access helpers ────────────────────────────────────
UserSchema.methods.isTrialActive = function () {
  return this.trialExpiresAt && new Date() < new Date(this.trialExpiresAt);
};

UserSchema.methods.isSubscriptionActive = function () {
  return this.subscriptionExpiresAt && new Date() < new Date(this.subscriptionExpiresAt);
};

UserSchema.methods.hasAccess = function () {
  return this.isTrialActive() || this.isSubscriptionActive();
};

// Serialise to a plain user object safe for API responses
UserSchema.methods.toProfile = function () {
  const now            = new Date();
  const trialActive    = this.isTrialActive();
  const subActive      = this.isSubscriptionActive();
  const hasAccess      = trialActive || subActive;

  // Days left in active period
  let daysLeft = 0;
  if (trialActive) {
    daysLeft = Math.ceil((new Date(this.trialExpiresAt) - now) / 86400000);
  } else if (subActive) {
    daysLeft = Math.ceil((new Date(this.subscriptionExpiresAt) - now) / 86400000);
  }

  return {
    id:                    this._id,
    phone:                 this.phone,
    email:                 this.email,
    name:                  this.name,
    state:                 this.state,
    simCount:              this.simCount,
    sims:                  this.sims,
    verified:              this.verified,
    lastVisit:             this.lastVisit,
    mfaEnabled:            this.mfaEnabled,
    isAdmin:               this.isAdmin || false,
    joinedAt:              this.joinedAt,
    // Access
    hasAccess,
    trialActive,
    subscriptionActive:    subActive,
    trialExpiresAt:        this.trialExpiresAt,
    subscriptionExpiresAt: this.subscriptionExpiresAt,
    paymentRef:            this.paymentRef,
    daysLeft,
    // Legacy compat
    reportUnlocked: hasAccess,
  };
};

module.exports = mongoose.model('User', UserSchema);
