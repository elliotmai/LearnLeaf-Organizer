#!/usr/bin/env node
/*
 * What's New pre-commit hook.
 *
 * Two jobs on every commit:
 *   1. If the What's New changelog (src/config/whatsNew.js) is staged, stamp its
 *      NEWEST entry's `version` with today's date (YYYY.MM.DD) and re-stage it,
 *      so you never have to hand-write or bump the date.
 *   2. If user-facing source changed but the changelog was NOT touched, print a
 *      reminder to add a What's New entry. Non-blocking by default — set the env
 *      var WHATSNEW_ENFORCE=1 to make a missing entry abort the commit instead.
 *
 * Bypass entirely with `git commit --no-verify`.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const git = (args) => execSync(`git ${args}`, { encoding: 'utf8' }).trim();

const root = git('rev-parse --show-toplevel');
const CONFIG_REL = 'src/config/whatsNew.js';
const configPath = path.join(root, CONFIG_REL);

// Staged, still-present files (Added/Copied/Modified/Renamed), repo-relative.
const staged = git('diff --cached --name-only --diff-filter=ACMR')
  .split('\n')
  .map((s) => s.trim().replace(/\\/g, '/'))
  .filter(Boolean);

const changelogStaged = staged.includes(CONFIG_REL);

const d = new Date();
const today = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// --- Job 1: stamp the newest entry's version with today's date ---
if (changelogStaged && existsSync(configPath)) {
  const src = readFileSync(configPath, 'utf8');
  // The newest entry is first, so replace only the first version: '....'.
  const re = /version:\s*(['"`])(\d{4}\.\d{2}\.\d{2})\1/;
  const m = src.match(re);
  if (m && m[2] !== today) {
    writeFileSync(configPath, src.replace(re, `version: '${today}'`));
    git(`add -- "${CONFIG_REL}"`);
    console.error(`[whats-new] Stamped newest changelog entry: ${m[2]} -> ${today}`);
  }
}

// --- Job 2: reminder when UI changed but the changelog didn't ---
const isUserFacing = (f) => {
  if (!f.startsWith('src/')) return false;
  if (f === CONFIG_REL) return false;
  if (f.startsWith('.githooks/')) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(f)) return false;
  if (/(^|\/)(setupTests|reportWebVitals|serviceWorker|serviceWorkerRegistration)\./.test(f)) return false;
  return /\.(jsx?|tsx?|css|scss|sass|less|html)$/.test(f);
};

if (staged.some(isUserFacing) && !changelogStaged) {
  console.error('');
  console.error('  [whats-new reminder] You changed user-facing code but did not add');
  console.error(`  a What's New entry. Add one at ${CONFIG_REL}`);
  console.error("  (newest first) — the date is stamped automatically on commit.");
  if (process.env.WHATSNEW_ENFORCE === '1') {
    console.error('  WHATSNEW_ENFORCE=1 is set -> aborting. Add an entry, or commit with --no-verify.');
    console.error('');
    process.exit(1);
  }
  console.error('  (Reminder only; commit continues. Set WHATSNEW_ENFORCE=1 to require one.)');
  console.error('');
}

process.exit(0);
