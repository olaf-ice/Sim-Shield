const express = require('express');
const jwt     = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode  = require('qrcode');

const User    = require('../models/User');
const OTP     = require('../models/OTP');
const Device  = require('../models/Device');
const Notification = require('../models/Notification');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;

// ── Helper: Track Device ─────────────────────────────────────────
async function trackDevice(user, req) {
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
  
  const existingDevice = await Device.findOne({ userId: user._id, userAgent });

  if (!existingDevice) {
    await Device.create({ userId: user._id, userAgent, ipAddress });
    await Notification.create({
      userId: user._id,
      title: 'New Device Login 🚨',
      message: `A new login was detected from ${userAgent} (IP: ${ipAddress}). If this wasn't you, secure your account immediately.`,
      type: 'security'
    });
  } else {
    existingDevice.lastActive = new Date();
    await existingDevice.save();
  }
}

// ── GET /api/auth/notifications ────────────────────────────────
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications });
  } catch (err) { next(err); }
});

router.post('/notifications/read', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── POST /api/auth/send-otp ────────────────────────────────────
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^0[7-9][0-1]\d{8}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid Nigerian phone number (e.g. 08012345678)' });
    }

    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL

    await OTP.deleteMany({ phone });
    await OTP.create({ phone, code, expiresAt });

    res.json({
      success:  true,
      message:  `OTP sent to ${phone}`,
      demo_otp: code, // ⚠️ REMOVE IN PRODUCTION
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/verify-otp ──────────────────────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP are required' });

    let user = await User.findOne({ phone });

    // Check account lock
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ success: false, message: 'Account locked due to too many failed attempts. Try again later.' });
    }

    const record = await OTP.findOne({ phone, used: false, expiresAt: { $gt: new Date() } });
    if (!record || record.code !== String(otp)) {
      if (user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          await Notification.create({
            userId: user._id,
            title: 'Multiple Failed Login Attempts ⚠️',
            message: 'Your account was temporarily locked after multiple failed OTP attempts.',
            type: 'security'
          });
        }
        await user.save();
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    record.used = true;
    await record.save();

    const isNewUser = !user;
    if (!user) {
      // Auto-start 7-day free trial for new users
      const trialStart = new Date();
      const trialEnd   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      user = await User.create({
        phone,
        verified:       true,
        lastVisit:      new Date(),
        trialStartedAt: trialStart,
        trialExpiresAt: trialEnd,
      });
    } else {
      user.verified  = true;
      user.lastVisit = new Date();
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // Step MFA Check
    if (user.mfaEnabled) {
      return res.json({ success: true, mfaRequired: true, phone: user.phone });
    }

    await trackDevice(user, req);

    const token = jwt.sign({ userId: user._id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
    res.json({ success: true, token, isNewUser, user: user.toProfile() });
  } catch (err) { next(err); }
});

// ── POST /api/auth/mfa/verify-login ────────────────────────────
router.post('/mfa/verify-login', async (req, res, next) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ success: false, message: 'Phone and Authenticator token required.' });

    const user = await User.findOne({ phone });
    if (!user || !user.mfaEnabled) return res.status(400).json({ success: false, message: 'Invalid MFA state.' });

    const isValid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });
    if (!isValid) {
      user.failedLoginAttempts += 1;
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid Authenticator code.' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await trackDevice(user, req);

    const jwtToken = jwt.sign({ userId: user._id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
    res.json({ success: true, token: jwtToken, isNewUser: false, user: user.toProfile() });
  } catch (err) { next(err); }
});

// ── POST /api/auth/mfa/setup ───────────────────────────────────
router.post('/mfa/setup', authenticate, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `SimShield (${req.user.phone})` });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return next(err);
      res.json({ success: true, tempSecret: secret.base32, qrCode: data_url });
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/mfa/enable ──────────────────────────────────
router.post('/mfa/enable', authenticate, async (req, res, next) => {
  try {
    const { token, tempSecret } = req.body;
    const isValid = speakeasy.totp.verify({ secret: tempSecret, encoding: 'base32', token, window: 1 });

    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });

    req.user.mfaEnabled = true;
    req.user.mfaSecret = tempSecret;
    await req.user.save();
    
    await Notification.create({
      userId: req.user._id,
      title: 'MFA Enabled 🔐',
      message: 'Multi-Factor Authentication was successfully enabled on your account.',
      type: 'security'
    });

    res.json({ success: true, user: req.user.toProfile() });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user.toProfile() });
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
