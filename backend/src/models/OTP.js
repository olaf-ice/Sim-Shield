const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  phone:     { type: String, required: true, index: true },
  code:      { type: String, required: true },
  used:      { type: Boolean, default: false },
  expiresAt: { type: Date,   required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });

module.exports = mongoose.model('OTP', OTPSchema);
