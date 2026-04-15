// auth.js — Appwrite authentication helpers
// Login, logout, session check. Uses the same Appwrite client as appwrite.js.

import { Client, Account } from 'appwrite';
import { getAppwriteConfig, getDbSource } from './appwrite.js';

let _client = null;
let _account = null;

function getAccount() {
  const cfg = getAppwriteConfig();
  if (!_client) {
    _client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);
    _account = new Account(_client);
  }
  return _account;
}

export function resetAuthClient() { _client = null; _account = null; }

// ─── Session check ────────────────────────────────────────────────────────────

/**
 * Returns the current user if logged in, null otherwise.
 * Only runs the check when cloud mode is active — local mode has no auth.
 */
export async function getCurrentUser() {
  if (getDbSource() !== 'cloud') return null;
  try {
    const account = getAccount();
    return await account.get();
  } catch {
    return null;
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Email + password login.
 * Returns { success, user, error }
 */
export async function login(email, password) {
  try {
    const account = getAccount();
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    return { success: true, user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  try {
    const account = getAccount();
    await account.deleteSession('current');
  } catch {}
  resetAuthClient();
}
