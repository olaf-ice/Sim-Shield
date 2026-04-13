const express  = require('express');
const Report   = require('../models/Report');
const authenticate = require('../middleware/authenticate');
const { analyzePatterns } = require('../services/riskEngine');

const router = express.Router();

// ── Admin-only guard ────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }
  next();
};

// ── GET /api/admin/analytics ───────────────────────────────────
router.get('/analytics', authenticate, adminOnly, async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [total, pending, verified, investigating, todayCount] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'verified' }),
      Report.countDocuments({ status: 'investigating' }),
      Report.countDocuments({ createdAt: { $gte: today } }),
    ]);

    res.json({ success: true, stats: { total, pending, verified, investigating, today: todayCount } });
  } catch (err) { next(err); }
});

// ── GET /api/admin/flagged ─────────────────────────────────────
router.get('/flagged', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { flagged } = await analyzePatterns();
    res.json({ success: true, flagged });
  } catch (err) { next(err); }
});

// ── GET /api/admin/heatmap ─────────────────────────────────────
router.get('/heatmap', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { heatmap, networkMap, typeMap, total } = await analyzePatterns();
    res.json({ success: true, heatmap, networkMap, typeMap, total });
  } catch (err) { next(err); }
});

// ── GET /api/admin/reports ─────────────────────────────────────
router.get('/reports', authenticate, adminOnly, async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip  = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(),
    ]);

    res.json({
      success: true, total, page,
      reports: reports.map(r => ({
        id:        r._id,
        phone:     r.phone,
        network:   r.network,
        state:     r.state,
        type:      r.type,
        identity:  r.identity,
        status:    r.status,
        timestamp: r.createdAt,
      })),
    });
  } catch (err) { next(err); }
});

module.exports = router;
