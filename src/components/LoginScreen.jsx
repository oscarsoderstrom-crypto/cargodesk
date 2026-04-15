// LoginScreen.jsx — Unified login gate for cloud (Appwrite) and local (password) modes
// Props: isDark, mode ('cloud'|'local'), onLogin(), hasPassword (local only)

import { useState } from 'react';
import { Anchor, Lock, Mail, Eye, EyeOff, AlertTriangle, Loader, KeyRound, ShieldCheck } from 'lucide-react';
import { login } from '../db/auth.js';
import { verifyLocalPassword, setLocalPassword, getPasswordHint } from '../utils/localAuth.js';

const DARK  = {bg0:"#0A0E17",bg1:"#0F1421",bg2:"#161C2E",bg3:"#1C2438",bg4:"#232D45",border0:"#1A2236",border1:"#243049",border2:"#2E3D5C",text0:"#F1F5F9",text1:"#CBD5E1",text2:"#8494B0",text3:"#4F5E78",accent:"#3B82F6",accentGlow:"rgba(59,130,246,0.12)",green:"#10B981",greenBg:"rgba(16,185,129,0.12)",greenBorder:"rgba(16,185,129,0.25)",amber:"#F59E0B",amberBg:"rgba(245,158,11,0.12)",amberBorder:"rgba(245,158,11,0.25)",red:"#EF4444",redBg:"rgba(239,68,68,0.10)",redBorder:"rgba(239,68,68,0.25)",shadow:"rgba(0,0,0,0.3)",shadowHeavy:"rgba(0,0,0,0.6)"};
const LIGHT = {bg0:"#F1F5F9",bg1:"#F5F6F8",bg2:"#FFFFFF",bg3:"#F9FAFB",bg4:"#F3F4F6",border0:"#E5E7EB",border1:"#E5E7EB",border2:"#D1D5DB",text0:"#0F172A",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",accent:"#2563EB",accentGlow:"rgba(37,99,235,0.08)",green:"#059669",greenBg:"#D1FAE5",greenBorder:"#6EE7B7",amber:"#D97706",amberBg:"#FEF3C7",amberBorder:"#FDE68A",red:"#DC2626",redBg:"#FEE2E2",redBorder:"#FECACA",shadow:"rgba(0,0,0,0.06)",shadowHeavy:"rgba(0,0,0,0.15)"};

function makeInputStyle(T, leftIcon = true, rightIcon = false) {
  return {
    width: '100%',
    padding: `11px ${rightIcon ? '42px' : '14px'} 11px ${leftIcon ? '40px' : '14px'}`,
    borderRadius: 9, fontSize: 14,
    border: `1px solid ${T.border2}`,
    background: T.bg3, color: T.text0,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
}

function PasswordField({ T, value, onChange, label = 'Password', autoComplete = 'current-password', autoFocus = false }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 7 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Lock size={15} color={T.text3} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder="••••••••" autoComplete={autoComplete} autoFocus={autoFocus} required
          style={makeInputStyle(T, true, true)}
          onFocus={e => e.target.style.borderColor = T.accent}
          onBlur={e => e.target.style.borderColor = T.border2} />
        <button type="button" onClick={() => setShow(v => !v)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 2 }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ T, message }) {
  if (!message) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 20, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13 }}>
      <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {message}
    </div>
  );
}

function SubmitButton({ T, loading, disabled, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading || disabled}
      style={{
        width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 700, border: 'none',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        background: loading || disabled ? T.bg4 : T.accent,
        color: loading || disabled ? T.text3 : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
      }}>
      {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> {loadingLabel}</> : label}
    </button>
  );
}

// ─── Cloud login ──────────────────────────────────────────────────────────────

function CloudLogin({ T, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true); setError(null);
    const result = await login(email.trim(), password);
    if (result.success) { onLogin(result.user); }
    else { setError('Incorrect email or password.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner T={T} message={error} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 7 }}>Email</label>
        <div style={{ position: 'relative' }}>
          <Mail size={15} color={T.text3} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" autoFocus required
            style={makeInputStyle(T, true, false)}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border2} />
        </div>
      </div>
      <PasswordField T={T} value={password} onChange={setPassword} />
      <div style={{ marginBottom: 20 }} />
      <SubmitButton T={T} loading={loading} disabled={!email.trim() || !password} label="Sign In" loadingLabel="Signing in…" />
    </form>
  );
}

// ─── Local password verify ────────────────────────────────────────────────────

function LocalLogin({ T, onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hint = getPasswordHint();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError(null);
    const ok = await verifyLocalPassword(password);
    if (ok) { onLogin(); }
    else { setError('Incorrect password.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorBanner T={T} message={error} />
      <PasswordField T={T} value={password} onChange={setPassword} autoFocus />
      {hint && <div style={{ fontSize: 12, color: T.text3, marginTop: -10, marginBottom: 16 }}>Hint: {hint}</div>}
      <div style={{ marginBottom: 20 }} />
      <SubmitButton T={T} loading={loading} disabled={!password} label="Unlock" loadingLabel="Verifying…" />
    </form>
  );
}

// ─── Local first-time setup ───────────────────────────────────────────────────

function LocalSetup({ T, onLogin }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 6;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(null);
    await setLocalPassword(password, hint);
    onLogin();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 20, background: T.accentGlow, border: `1px solid rgba(59,130,246,0.2)`, color: T.accent, fontSize: 13, lineHeight: 1.6 }}>
        <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
        First time setup — create a password to protect your local data.
      </div>
      <ErrorBanner T={T} message={error} />
      <PasswordField T={T} value={password} onChange={setPassword} label="Create Password" autoComplete="new-password" autoFocus />
      {weak && <div style={{ fontSize: 12, color: T.amber, marginTop: -10, marginBottom: 12 }}>At least 6 characters required.</div>}
      <PasswordField T={T} value={confirm} onChange={setConfirm} label="Confirm Password" autoComplete="new-password" />
      {mismatch && <div style={{ fontSize: 12, color: T.red, marginTop: -10, marginBottom: 12 }}>Passwords do not match.</div>}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 7 }}>
          Password Hint <span style={{ fontWeight: 400, color: T.text3 }}>(optional)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <KeyRound size={15} color={T.text3} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" value={hint} onChange={e => setHint(e.target.value)}
            placeholder="Something to jog your memory"
            style={makeInputStyle(T, true, false)}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border2} />
        </div>
        <div style={{ fontSize: 11, color: T.text3, marginTop: 5 }}>This hint is stored as plain text — don't make it the password itself.</div>
      </div>
      <div style={{ marginBottom: 20 }} />
      <SubmitButton T={T} loading={loading} disabled={!password || !confirm || mismatch || weak}
        label="Set Password & Continue" loadingLabel="Setting up…" />
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoginScreen({ isDark = true, mode = 'cloud', hasPassword = false, onLogin }) {
  const T = isDark ? DARK : LIGHT;
  const isCloud    = mode === 'cloud';
  const isSetup    = !isCloud && !hasPassword;
  const isLocalPin = !isCloud && hasPassword;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: T.bg0,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px', background: 'linear-gradient(135deg,#2563EB,#60A5FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(59,130,246,0.35)' }}>
            <Anchor size={26} color="white" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text0, marginBottom: 6 }}>CargoDesk</div>
          <div style={{ fontSize: 13, color: T.text3 }}>
            {isCloud ? 'Sign in to continue' : isSetup ? 'Set up local access' : 'Enter your password'}
          </div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 3, opacity: 0.7 }}>
            {isCloud ? 'Cloud mode — Appwrite authentication' : 'Local mode — data stored in this browser'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${T.border1}`, boxShadow: `0 20px 60px ${T.shadowHeavy}`, padding: '28px 28px 24px' }}>
          {isCloud    && <CloudLogin  T={T} onLogin={onLogin} />}
          {isLocalPin && <LocalLogin  T={T} onLogin={onLogin} />}
          {isSetup    && <LocalSetup  T={T} onLogin={onLogin} />}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.text3, lineHeight: 1.6 }}>
          {isCloud
            ? 'Access restricted — contact the administrator for an account.'
            : 'Local data is only accessible from this browser.'}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
