const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  phone:       { type: String, required: true, index: true },
  network:     { type: String, required: true, enum: ['MTN', 'Airtel', 'Glo', '9mobile'] },
  state:       { type: String, required: true },
  lga:         { type: String, default: '' },
  type:        { type: String, required: true, enum: ['not_mine', 'agent_fraud', 'identity_theft', 'sim_swap', 'other'] },
  identity:    { type: String, default: '' },
  description: { type: String, default: '' },
  status:      { type: String, default: 'pending', enum: ['pending', 'investigating', 'verified', 'closed'] },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
