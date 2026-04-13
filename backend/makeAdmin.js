require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const PHONE = process.argv[2]; // pass phone as argument

async function makeAdmin() {
  if (!PHONE) {
    console.log('Usage: node makeAdmin.js 08012345678');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const user = await User.findOneAndUpdate(
    { phone: PHONE },
    { $set: { isAdmin: true } },
    { new: true, upsert: false }
  );

  if (!user) {
    console.log(`❌ No user found with phone: ${PHONE}`);
    console.log('Sign up on the live site first, then run this script.');
  } else {
    console.log(`✅ ${user.phone} (${user.name || 'No name'}) is now an admin!`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

makeAdmin().catch(err => { console.error(err); process.exit(1); });
