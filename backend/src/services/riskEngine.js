// ============================================================
// riskEngine.js — Server-side SIM Identity Risk Scoring
// Mirror of the frontend risk.js logic, now running on MongoDB data
// ============================================================
const Report = require('../models/Report');

const WEIGHTS = {
  reportAgainstIdentity: 20,
  multiUserComplaints:   30,
  highSimCount:          15,
  unverifiedPhone:       10,
  nameLinkedToFraud:     25,
  agentFraud:            18,
  simSwap:               22,
  recentActivity:         5,
};

const BANDS = [
  { max: 25,  level: 'low',      label: 'Low Risk',      color: '#00ff88', emoji: '🟢' },
  { max: 55,  level: 'moderate', label: 'Moderate Risk', color: '#ffb800', emoji: '🟡' },
  { max: 80,  level: 'high',     label: 'High Risk',     color: '#ff6b35', emoji: '🟠' },
  { max: 101, level: 'critical', label: 'Critical',      color: '#ff3366', emoji: '🔴' },
];

function getBand(score) {
  return BANDS.find(b => score <= b.max) || BANDS[BANDS.length - 1];
}

async function calculateRiskScore(user) {
  const allReports = await Report.find({}).lean();
  let score = 0;
  const reasons = [];

  const userPhones = (user.sims || []).map(s => s.number).filter(Boolean);
  const directReports = allReports.filter(r => userPhones.includes(r.phone));

  if (directReports.length > 0) {
    score += Math.min(directReports.length * WEIGHTS.reportAgainstIdentity, 60);
    reasons.push(`${directReports.length} report(s) filed against your registered number(s)`);
  }

  directReports.forEach(r => {
    const dupes = allReports.filter(x => x.phone === r.phone && String(x._id) !== String(r._id));
    if (dupes.length >= 2) {
      score += WEIGHTS.multiUserComplaints;
      reasons.push(`Phone ${r.phone} has ${dupes.length + 1} reports from multiple users`);
    }
  });

  if ((user.simCount || 0) > 3) {
    score += WEIGHTS.highSimCount;
    reasons.push(`You declared ${user.simCount} SIMs — above average`);
  }

  if (!user.verified) {
    score += WEIGHTS.unverifiedPhone;
    reasons.push('Phone number not yet verified');
  }

  if (user.name) {
    const parts = user.name.toLowerCase().split(' ');
    const nameMatches = allReports.filter(r =>
      r.identity && parts.some(p => p.length > 2 && r.identity.toLowerCase().includes(p))
    );
    if (nameMatches.length > 0) {
      score += WEIGHTS.nameLinkedToFraud;
      reasons.push(`Your name appears in ${nameMatches.length} fraud report pattern(s)`);
    }
  }

  if (directReports.some(r => r.type === 'agent_fraud')) {
    score += WEIGHTS.agentFraud;
    reasons.push('Agent fraud reports linked to your identity');
  }

  if (directReports.some(r => r.type === 'sim_swap')) {
    score += WEIGHTS.simSwap;
    reasons.push('SIM swap fraud detected on your number');
  }

  const cutoff = Date.now() - 48 * 3600 * 1000;
  if (directReports.some(r => new Date(r.createdAt).getTime() > cutoff)) {
    score += WEIGHTS.recentActivity;
    reasons.push('Recent fraud activity in the last 48 hours');
  }

  score = Math.min(Math.round(score), 100);
  const band = getBand(score);
  return { score, ...band, reasons };
}

async function analyzePatterns() {
  const reports = await Report.find({}).lean();

  // Group by phone -> flag identities with multiple reports
  const phoneGroups = {};
  reports.forEach(r => {
    if (!phoneGroups[r.phone]) phoneGroups[r.phone] = [];
    phoneGroups[r.phone].push(r);
  });

  const flagged = Object.entries(phoneGroups)
    .filter(([, reps]) => reps.length > 1)
    .map(([phone, reps]) => {
      const sorted = [...reps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      let identityScore = Math.min(reps.length * 22, 95);
      if (reps.some(r => r.type === 'agent_fraud')) identityScore += 10;
      if (reps.some(r => r.type === 'sim_swap'))    identityScore += 12;
      identityScore = Math.min(identityScore, 99);
      return {
        phone,
        name:        sorted[0].identity || 'Unknown',
        reportCount: reps.length,
        networks:    [...new Set(reps.map(r => r.network))],
        states:      [...new Set(reps.map(r => r.state))],
        score:       identityScore,
        band:        getBand(identityScore),
        lastSeen:    sorted[0].createdAt,
        types:       [...new Set(reps.map(r => r.type))],
      };
    })
    .sort((a, b) => b.score - a.score);

  const stateMap = {};
  const networkMap = {};
  const typeMap = {};
  reports.forEach(r => {
    stateMap[r.state]     = (stateMap[r.state]     || 0) + 1;
    networkMap[r.network] = (networkMap[r.network] || 0) + 1;
    typeMap[r.type]       = (typeMap[r.type]       || 0) + 1;
  });

  const heatmap = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return { flagged, heatmap, networkMap, typeMap, total: reports.length };
}

module.exports = { calculateRiskScore, analyzePatterns, getBand, BANDS };
