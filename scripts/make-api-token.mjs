#!/usr/bin/env node
/*
 * Generates a personal API token for netlify/functions/api.mjs and prints the
 * SHA-256 hash to store on your Firestore user document.
 *
 *   node scripts/make-api-token.mjs
 *
 * 1. Keep the token somewhere private (a password manager). It is shown once and
 *    is never stored anywhere in plain text.
 * 2. In the Firebase console → Firestore → users → <your user id>, add a string
 *    field named  apiTokenHash  with the hash value.
 * To revoke or rotate, delete or replace that field.
 */
import { randomBytes, createHash } from 'node:crypto';

const token = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token).digest('hex');

console.log(`\nAPI token (keep private, shown once):\n  ${token}\n`);
console.log(`apiTokenHash (add to your users/<uid> document):\n  ${hash}\n`);
