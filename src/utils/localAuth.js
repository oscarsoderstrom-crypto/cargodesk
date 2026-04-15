// localAuth.js — Local mode password gate
// Password is stored as SHA-256 hash in localStorage — never plaintext.
// Session is kept in sessionStorage so it clears when the tab/browser closes.

const HASH_KEY    = 'cargodesk_local_pw_hash';
const HINT_KEY    = 'cargodesk_local_pw_hint';
const SESSION_KEY = 'cargodesk_local_session';

// ─── Hashing ──────────────────────────────────────────────────────────────────

export async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const buffer  = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Password setup ───────────────────────────────────────────────────────────

export function hasLocalPassword() {
  try { return !!localStorage.getItem(HASH_KEY); } catch { return false; }
}

export async function setLocalPassword(password, hint = '') {
  const hash = await hashPassword(password);
  try {
    localStorage.setItem(HASH_KEY, hash);
    localStorage.setItem(HINT_KEY, hint || '');
    // Immediately start a session after setting
    sessionStorage.setItem(SESSION_KEY, hash.slice(0, 16));
  } catch {}
}

export function getPasswordHint() {
  try { return localStorage.getItem(HINT_KEY) || ''; } catch { return ''; }
}

export function clearLocalPassword() {
  try {
    localStorage.removeItem(HASH_KEY);
    localStorage.removeItem(HINT_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function hasActiveLocalSession() {
  try {
    const hash    = localStorage.getItem(HASH_KEY);
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!hash || !session) return false;
    return session === hash.slice(0, 16);
  } catch { return false; }
}

export function clearLocalSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export async function verifyLocalPassword(password) {
  try {
    const stored = localStorage.getItem(HASH_KEY);
    if (!stored) return false;
    const hash = await hashPassword(password);
    if (hash === stored) {
      // Start session
      sessionStorage.setItem(SESSION_KEY, hash.slice(0, 16));
      return true;
    }
    return false;
  } catch { return false; }
}
