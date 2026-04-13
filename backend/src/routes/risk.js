const express  = require('express');
const authenticate = require('../middleware/authenticate');
const { calculateRiskScore } = require('../services/riskEngine');

const router = express.Router();

// ── GET /api/risk/score ────────────────────────────────────────
router.get('/score', authenticate, async (req, res, next) => {
  try {
    const result = await calculateRiskScore(req.user);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

module.exports = router;
