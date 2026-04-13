const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userAgent:   { type: String, required: true },
  ipAddress:   { type: String, required: true },
  deviceToken: { type: String, required: false }, // Useful if we wanted persistent device tokens
  lastActive:  { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);
