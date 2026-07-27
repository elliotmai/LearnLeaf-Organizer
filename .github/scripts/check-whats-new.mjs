#!/usr/bin/env node
/*
 * CI guard: every change that touches user-facing code must either add a
 * "What's New" entry (src/config/whatsNew.js changes) OR carry an explicit
 * opt-out — the tag `[whats-new: none]` in any commit message in the range.
 *
 * Env (set by the workflow): BASE_SHA, HEAD_SHA. Falls back to HEAD~1..HEAD.
 */
import { execSync } from 'node:child_process';

const CONFIG_REL = 'src/config/whatsNew.js';
const ZERO = '0000000000000000000000000000000000000000';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const safe = (cmd) => {
  try {
    // Swallow stderr so expected "unknown revision" probes don't clutter CI logs.
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA || 'HEAD';

let range;
if (base && base !== ZERO && safe(`git cat-file -t ${base}`) === 'commit') {
  range = `${base}..${head}`;
} else {
  // New branch / first push / shallow: compare against the previous commit.
  range = safe('git rev-parse HEAD~1') ? `HEAD~1..${head}` : '';
}

const changed = (range ? safe(`git diff --name-only ${range}`) : safe(`git show --name-only --pretty="" ${head}`))
  .split('\n')
  .map((s) => s.trim().replace(/\\/g, '/'))
  .filter(Boolean);

const messages = range ? safe(`git log --format=%B ${range}`) : safe(`git log -1 --format=%B ${head}`);

const isUserFacing = (f) => {
  if (!f.startsWith('src/')) return false;
  if (f === CONFIG_REL) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(f)) return false;
  return /\.(jsx?|tsx?|css|scss|sass|less|html)$/.test(f);
};

const uiFiles = changed.filter(isUserFacing);
const changelogChanged = changed.includes(CONFIG_REL);
const optedOut = /\[whats-new:\s*none\]/i.test(messages);

if (uiFiles.length === 0) {
  console.log('✓ No user-facing changes detected — nothing to check.');
  process.exit(0);
}
if (changelogChanged) {
  console.log("✓ User-facing changes include a What's New update.");
  process.exit(0);
}
if (optedOut) {
  console.log('✓ User-facing changes, but [whats-new: none] opt-out is present.');
  process.exit(0);
}

console.error('');
console.error("✗ User-facing code changed but there's no What's New entry.");
console.error(`  Changed files:\n${uiFiles.map((f) => `    - ${f}`).join('\n')}`);
console.error('');
console.error('  Fix ONE of these:');
console.error(`    • Add an entry at the top of ${CONFIG_REL}, or`);
console.error('    • If users truly won’t notice, put [whats-new: none] in a commit message.');
console.error('');
process.exit(1);
