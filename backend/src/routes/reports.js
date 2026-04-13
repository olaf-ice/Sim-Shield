const express  = require('express');
const Report   = require('../models/Report');
const User     = require('../models/User');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
const VALID_NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];
const VALID_TYPES    = ['not_mine', 'agent_fraud', 'identity_theft', 'sim_swap', 'other'];

function fmt(r) {
  return {
    id:          r._id,
    phone:       r.phone,
    network:     r.network,
    state:       r.state,
    lga:         r.lga,
    type:        r.type,
    identity:    r.identity,
    description: r.description,
    status:      r.status,
    timestamp:   r.createdAt,
  };
}

// ── POST /api/reports ──────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { phone, network, state, lga, type, description } = req.body;

    if (!phone || !/^0[7-9][0-1]\d{8}$/.test(phone))
      return res.status(400).json({ success: false, message: 'Valid Nigerian phone number required' });
    if (!VALID_NETWORKS.includes(network))
      return res.status(400).json({ success: false, message: 'Valid network required' });
    if (!state)
      return res.status(400).json({ success: false, message: 'State is required' });
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ success: false, message: 'Valid fraud type required' });

    const report = await Report.create({
      reporterId:  req.user._id,
      phone,
      network,
      state,
      lga:         lga || '',
      type,
      identity:    req.user.name || '',
      description: description || '',
      status:      'pending',
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { reportsMade: report._id } });

    res.status(201).json({ success: true, message: 'Report submitted successfully', report: fmt(report) });
  } catch (err) { next(err); }
});

// ── GET /api/reports/mine ──────────────────────────────────────
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const reports = await Report.find({ reporterId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, reports: reports.map(fmt) });
  } catch (err) { next(err); }
});

// ── GET /api/reports  (admin — all reports, paginated) ─────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip  = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(),
    ]);

    res.json({ success: true, total, page, reports: reports.map(fmt) });
  } catch (err) { next(err); }
});

module.exports = router;
