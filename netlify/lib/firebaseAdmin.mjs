/*
 * Shared helpers for the Netlify functions (api.mjs, connections.mjs).
 * Lives outside netlify/functions so Netlify does not deploy it as a function;
 * esbuild bundles it into each function that imports it.
 */
import { createHash } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not set');
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try { return JSON.parse(text); } catch { throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not valid JSON'); }
}

function ensureApp() {
  if (!getApps().length) initializeApp({ credential: cert(readServiceAccount()) });
}

export function getDb() {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureApp();
  return getAuth();
}

export const hashToken = token => createHash('sha256').update(token).digest('hex');

// Reads "Authorization: Bearer <x>"; '' when absent.
export const bearer = req => {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};
