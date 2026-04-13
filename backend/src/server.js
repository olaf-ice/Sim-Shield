require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ── Routes ─────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const reportRoutes  = require('./routes/reports');
const riskRoutes    = require('./routes/risk');
const paymentRoutes = require('./routes/payment');
const adminRoutes   = require('./routes/admin');

// ── Connect to MongoDB ─────────────────────────────────────────
connectDB();

const app = express();

// ── Security ───────────────────────────────────────────────────
app.use(helmet());

const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'https://olaf-ice.github.io',
  'https://sim-shield-sand.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

// Stricter limit for OTP endpoint
app.use('/api/auth/send-otp', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait a minute.' },
}));

// ── Body parser ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/risk',    riskRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin',   adminRoutes);

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'SimShield API', timestamp: new Date().toISOString() });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ───────────────────────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n🛡️  ══════════════════════════════════════════');
  console.log(`   SimShield API  •  http://localhost:${PORT}/api`);
  console.log(`   Environment  : ${process.env.NODE_ENV || 'development'}`);
  console.log('   ══════════════════════════════════════════\n');
  console.log('   Endpoints:');
  console.log('   POST  /api/auth/send-otp');
  console.log('   POST  /api/auth/verify-otp');
  console.log('   GET   /api/auth/me');
  console.log('   PUT   /api/users/profile');
  console.log('   PUT   /api/users/sims');
  console.log('   POST  /api/reports');
  console.log('   GET   /api/reports/mine');
  console.log('   GET   /api/risk/score');
  console.log('   GET   /api/payment/status');
  console.log('   POST  /api/payment/verify');
  console.log('   GET   /api/admin/analytics');
  console.log('   GET   /api/admin/flagged');
  console.log('   GET   /api/admin/heatmap\n');
});

module.exports = app;
