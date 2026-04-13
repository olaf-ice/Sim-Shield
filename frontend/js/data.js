// ============================================================
// data.js — Constants only (localStorage removed — backend handles data)
// ============================================================

const NETWORKS = [
  { id: 'MTN',     label: 'MTN Nigeria',    emoji: '🟡', color: '#ffcc00' },
  { id: 'Airtel',  label: 'Airtel Nigeria', emoji: '🔴', color: '#ff3300' },
  { id: 'Glo',     label: 'Glo Mobile',     emoji: '🟢', color: '#00a000' },
  { id: '9mobile', label: '9mobile',         emoji: '🔵', color: '#048296' },
];

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

const FRAUD_TYPES = [
  { id: 'not_mine',       label: 'SIM Not Registered By Me',      icon: '🚫' },
  { id: 'agent_fraud',    label: 'Agent Fraud / Unauthorized Reg', icon: '🕵️' },
  { id: 'identity_theft', label: 'Identity Theft',                 icon: '👤' },
  { id: 'sim_swap',       label: 'Unauthorized SIM Swap',          icon: '🔄' },
  { id: 'other',          label: 'Other Suspicious Activity',      icon: '⚠️' },
];

window.NETWORKS        = NETWORKS;
window.NIGERIAN_STATES = NIGERIAN_STATES;
window.FRAUD_TYPES     = FRAUD_TYPES;
