// ============================================================
// seed.js — Populates MongoDB with realistic demo data
// Run: npm run seed
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Report   = require('./models/Report');

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simshield';

const SEED_REPORTS = [
  { phone:'08031234567', network:'MTN',    state:'Lagos',         lga:'Alimosho',     type:'not_mine',      identity:'Emeka Okafor',  status:'verified',      daysAgo:5 },
  { phone:'08059876543', network:'Airtel', state:'Oyo',           lga:'Ibadan North',  type:'agent_fraud',   identity:'Chidi Nweze',   status:'investigating', daysAgo:3 },
  { phone:'07022233445', network:'Glo',    state:'Kano',          lga:'Nassarawa',     type:'not_mine',      identity:'Ibrahim Yusuf', status:'pending',       daysAgo:2 },
  { phone:'09011122334', network:'9mobile',state:'Lagos',         lga:'Ikeja',         type:'not_mine',      identity:'Tunde Adeyemi', status:'pending',       daysAgo:1 },
  { phone:'08031234567', network:'MTN',    state:'FCT - Abuja',   lga:'Garki',         type:'agent_fraud',   identity:'Emeka Okafor',  status:'verified',      daysAgo:4 },
  { phone:'08076543210', network:'MTN',    state:'Oyo',           lga:'Ibadan South',  type:'not_mine',      identity:'Amaka Obi',     status:'verified',      daysAgo:6 },
  { phone:'07055512233', network:'Glo',    state:'Rivers',        lga:'GRA',           type:'agent_fraud',   identity:'Chisom Eze',    status:'pending',       daysAgo:7 },
  { phone:'08059876543', network:'Airtel', state:'Oyo',           lga:'Ibadan North',  type:'not_mine',      identity:'Chidi Nweze',   status:'investigating', daysAgo:1 },
  { phone:'08031551234', network:'MTN',    state:'Enugu',         lga:'Enugu North',   type:'not_mine',      identity:'Obiora Chukwu', status:'pending',       daysAgo:2 },
  { phone:'09022244556', network:'Airtel', state:'Lagos',         lga:'Lagos Island',  type:'agent_fraud',   identity:'Sade Ojo',      status:'verified',      daysAgo:3 },
  { phone:'07011223344', network:'Glo',    state:'Kaduna',        lga:'Kaduna North',  type:'identity_theft',identity:'Musa Bello',    status:'pending',       daysAgo:8 },
  { phone:'08033445566', network:'MTN',    state:'Delta',         lga:'Warri Central', type:'sim_swap',      identity:'Ovie Oghenero', status:'verified',      daysAgo:10 },
];

async function seed() {
  try {
    await mongoose.connect(URI);
    console.log('\n📦 Connected to MongoDB');

    await Report.deleteMany({});
    console.log('🗑️  Cleared existing reports');

    const reportsToInsert = SEED_REPORTS.map(s => ({
      reporterId:  null,
      phone:       s.phone,
      network:     s.network,
      state:       s.state,
      lga:         s.lga,
      type:        s.type,
      identity:    s.identity,
      description: 'Seeded report for demonstration purposes.',
      status:      s.status,
      createdAt:   new Date(Date.now() - s.daysAgo * 86400000),
      updatedAt:   new Date(Date.now() - s.daysAgo * 86400000),
    }));

    await Report.insertMany(reportsToInsert);
    console.log(`✅ Inserted ${reportsToInsert.length} seed reports`);

    console.log('\n🛡️  ─────────────────────────────────────');
    console.log('   SimShield database seeded successfully!');
    console.log('   Now run: npm run dev');
    console.log('   ─────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
