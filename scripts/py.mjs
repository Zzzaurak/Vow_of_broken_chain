#!/usr/bin/env node
// Run a project Python script from an npm script on any platform.
// Windows ships a python3.exe Store placeholder that exits 9009, so candidates are
// probed instead of trusted, and UTF-8 mode keeps builds identical across locales.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const script = process.argv[2];
if (!script) {
  console.error('usage: node scripts/py.mjs <script.py> [args...]');
  process.exit(2);
}

// The path comes from an npm script, so resolve it the way the shell would: relative to
// the caller's working directory (frontend/), not to this file.
const target = path.resolve(process.cwd(), script);
if (!existsSync(target)) {
  console.error(`Missing script: ${target}`);
  process.exit(2);
}

const candidates = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
let chosen = null;
for (const candidate of candidates) {
  // A Store alias placeholder exits non-zero, and probing it must never hang the build.
  const result = spawnSync(candidate, ['-c', 'import sys'], { stdio: 'ignore', timeout: 10000 });
  if (!result.error && result.status === 0) {
    chosen = candidate;
    break;
  }
}

if (!chosen) {
  console.error(`No working Python interpreter found; tried ${candidates.join(', ')}.`);
  process.exit(1);
}

const run = spawnSync(chosen, [target, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
});
process.exit(run.status ?? 1);
