/*
 * Activates the What's New pre-commit hook for this repo (husky-style).
 * Runs automatically via the package.json "prepare" script after `npm install`,
 * so a fresh clone gets the hook without any manual step. No-ops quietly when
 * there's no git working copy (CI installs, tarball installs, etc.).
 */
import { execSync } from 'node:child_process';

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch {
  // Not a git repo or git unavailable — nothing to activate.
}
