#!/usr/bin/env node
/*
 * LEGACY. New tokens should come from the Connected apps screen in the app
 * (Account & Preferences → Connected apps): it mints a token per app, shows it
 * once, tracks when it was last used, and revokes it with one click. Tokens made
 * by this script still work; use it only if you need a token without the app.
 *
 * Generates a personal API token for netlify/functions/api.mjs and prints the
 * SHA-256 hash to store on your Firestore user document.
 *
 *   node scripts/make-api-token.mjs
 *
 * 1. Keep the token somewhere private (a password manager). It is shown once and
 *    is never stored anywhere in plain text.
 * 2. In the Firebase console → Firestore → users → <your user id>, either set the
 *    string field  apiTokenHash  to the hash (your first token), or add the hash
 *    to the array field  apiTokenHashes  (one entry per connected app, e.g. a
 *    separate token for Fridge Board, so each can be revoked on its own).
 * To revoke a token, delete its field or array entry.
 */
import { randomBytes, createHash } from 'node:crypto';

const token = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token).digest('hex');

console.log(`\nAPI token (keep private, shown once):\n  ${token}\n`);
console.log(`Hash (set as apiTokenHash, or add to the apiTokenHashes array, on users/<uid>):\n  ${hash}\n`);
