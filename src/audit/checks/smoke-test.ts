/**
 * Check 6 — Smoke test present.
 *
 * File-system check on the resolved package dir:
 *   - looks for scripts/smoke*.mjs, scripts/smoke*.js, scripts/smoke*.ts
 *   - looks for a "test" script in package.json that isn't the literal default
 *
 * Score:
 *   10 — has scripts/smoke*.{mjs,js,ts}
 *    7 — has a `test` script in package.json
 *    0 — neither
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult, ProbeSnapshot, ResolvedTarget } from '../../types.js';

const SMOKE_NAME_RE = /^smoke[\w-]*\.(mjs|js|ts)$/i;
const DEFAULT_TEST = 'echo "Error: no test specified" && exit 1';

export function checkSmokeTest(_snapshot: ProbeSnapshot, target: ResolvedTarget): CheckResult {
  const scriptsDir = join(target.packageDir, 'scripts');
  let smokeFiles: string[] = [];
  if (existsSync(scriptsDir)) {
    try {
      smokeFiles = readdirSync(scriptsDir).filter((f) => SMOKE_NAME_RE.test(f));
    } catch {
      smokeFiles = [];
    }
  }

  const pkg = target.packageJson;
  const scripts = (pkg?.scripts ?? {}) as Record<string, string>;
  const hasRealTest =
    typeof scripts.test === 'string' && scripts.test.trim().length > 0 && scripts.test !== DEFAULT_TEST;

  let score: number;
  let summary: string;
  let status: CheckResult['status'];
  const details: string[] = [];

  if (smokeFiles.length > 0) {
    score = 10;
    status = 'pass';
    summary = `scripts/${smokeFiles[0]} found`;
    if (smokeFiles.length > 1) details.push(`Also: ${smokeFiles.slice(1).join(', ')}`);
  } else if (hasRealTest) {
    score = 7;
    status = 'warn';
    summary = 'has `test` script in package.json';
    details.push('Add a dedicated smoke runner under `scripts/` for clearer CI signal.');
  } else {
    score = 0;
    status = 'fail';
    summary = 'no smoke script and no test script';
  }

  const fixes: string[] = [];
  if (score < 10) {
    fixes.push(
      'Add `scripts/smoke-tools.mjs` that boots the server via StdioClientTransport and asserts the tool list.'
    );
  }

  return { id: 'smoke_test', label: 'Smoke test', score, status, summary, details, fixes };
}
