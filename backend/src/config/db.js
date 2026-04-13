const mongoose = require('mongoose');
const dns      = require('dns');

// ── Force Google DNS so SRV records resolve on any network ──────
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/simshield';

  // ── Try primary URI first ────────────────────────────────────
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS : 15000,  // 15s — generous for cloud
      connectTimeoutMS         : 15000,
      socketTimeoutMS          : 45000,
      tls                      : true,
      retryWrites              : true,
      maxPoolSize              : 10,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return;
  } catch (err) {
    console.warn(`⚠️  Primary MongoDB unreachable: ${err.message}`);
    console.log('🔄 Falling back to in-memory MongoDB for local dev...');
  }

  // ── Fallback: mongodb-memory-server ─────────────────────────
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`✅ In-memory MongoDB running at: ${memUri}`);
    console.log('   ⚠️  Data will NOT persist between restarts (dev mode only)');

    // Graceful shutdown
    process.on('SIGINT',  async () => { await mongod.stop(); process.exit(0); });
    process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
  } catch (fallbackErr) {
    console.error(`❌ All MongoDB options failed: ${fallbackErr.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
