// ============================================================
// api.js — Centralized API client (replaces all localStorage calls)
// All data now lives in MongoDB via the Express backend.
// ============================================================

// Auto-detect environment: use live backend when not on localhost
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://simshield-api.onrender.com/api';

const Api = (() => {

  // ── Token storage ──────────────────────────────────────────
  function getToken()        { return localStorage.getItem('ss_token'); }
  function setToken(t)       { localStorage.setItem('ss_token', t); }
  function getUser()         { try { return JSON.parse(localStorage.getItem('ss_user')); } catch { return null; } }
  function setUser(u)        { localStorage.setItem('ss_user', JSON.stringify(u)); }
  function clearAuth()       { localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user'); }
  function isAuthenticated() { return !!getToken() && !!getUser(); }

  // ── Core fetch wrapper ─────────────────────────────────────
  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(API_BASE + path, opts);
    } catch {
      throw new Error('Cannot reach the SimShield server. Is the backend running on port 5000?');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Server error (${res.status})`);
    return data;
  }

  return {
    get:  (path)       => request('GET',    path),
    post: (path, body) => request('POST',   path, body),
    put:  (path, body) => request('PUT',    path, body),
    del:  (path)       => request('DELETE', path),
    getToken, setToken, getUser, setUser, clearAuth, isAuthenticated,
  };
})();

window.Api = Api;
