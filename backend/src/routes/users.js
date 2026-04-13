const express  = require('express');
const User     = require('../models/User');
const Notification = require('../models/Notification');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

const VALID_NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

// ── PUT /api/users/profile ─────────────────────────────────────
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, state, simCount } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!state)                return res.status(400).json({ success: false, message: 'State is required' });

    req.user.name     = name.trim();
    req.user.state    = state;
    if (simCount !== undefined) req.user.simCount = Number(simCount);
    await req.user.save();

    res.json({ success: true, user: req.user.toProfile() });
  } catch (err) { next(err); }
});

// ── PUT /api/users/sims ────────────────────────────────────────
router.put('/sims', authenticate, async (req, res, next) => {
  try {
    const { simCount, sims } = req.body;

    if (sims && sims.length > 4) {
      return res.status(400).json({ success: false, message: 'Maximum 4 SIMs allowed' });
    }

    for (const sim of (sims || [])) {
      if (!VALID_NETWORKS.includes(sim.network)) {
        return res.status(400).json({ success: false, message: `Invalid network: ${sim.network}` });
      }
    }

    req.user.simCount = simCount ?? (sims ? sims.length : 0);
    req.user.sims     = sims || [];
    await req.user.save();
    
    // Simulate SIM change/swap detection alert
    await Notification.create({
      userId: req.user._id,
      title: 'SIM Profile Changed 📱',
      message: 'Your linked SIM cards were updated. If you did not authorize this swap or addition, please report it immediately.',
      type: 'account'
    });

    res.json({ success: true, message: 'SIMs updated', simCount: req.user.simCount, sims: req.user.sims });
  } catch (err) { next(err); }
});

// ── GET /api/users/sims ────────────────────────────────────────
router.get('/sims', authenticate, (req, res) => {
  res.json({ success: true, simCount: req.user.simCount, sims: req.user.sims });
});

module.exports = router;
