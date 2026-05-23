/**
 * Check 2 — Tool naming convention.
 *
 * Looks for:
 *   - all tools share a common prefix (e.g. "whoop_", "nourish_")
 *   - all tools are snake_case (lowercase a-z, digits, underscores)
 *   - no whitespace, hyphens, dots, uppercase
 *
 * Score:
 *   10 — single prefix + all snake_case
 *    7 — all snake_case but no common prefix
 *    4 — some non-snake_case
 *    0 — chaotic
 */

import type { CheckResult, ProbeSnapshot } from '../../types.js';

const SNAKE_RE = /^[a-z][a-z0-9_]*$/;

function longestCommonPrefix(names: string[]): string {
  if (names.length === 0) return '';
  let prefix = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }
  // We want a meaningful prefix ending at "_" — e.g. "whoop_" not "wh".
  const cut = prefix.lastIndexOf('_');
  return cut > 0 ? prefix.slice(0, cut + 1) : '';
}

export function checkToolNaming(snapshot: ProbeSnapshot): CheckResult {
  const names = snapshot.tools.map((t) => t.name);
  if (names.length === 0) {
    return {
      id: 'tool_naming',
      label: 'Tool naming convention',
      score: 0,
      status: 'fail',
      summary: 'no tools to inspect',
      details: [],
      fixes: []
    };
  }

  const offenders = names.filter((n) => !SNAKE_RE.test(n));
  const prefix = longestCommonPrefix(names);

  let score: number;
  let summary: string;
  if (offenders.length === 0 && prefix && names.every((n) => n.startsWith(prefix))) {
    score = 10;
    summary = `consistent \`${prefix}\` prefix, snake_case`;
  } else if (offenders.length === 0) {
    score = 7;
    summary = 'all snake_case but no shared prefix';
  } else if (offenders.length < names.length / 3) {
    score = 4;
    summary = `${offenders.length}/${names.length} tools violate snake_case`;
  } else {
    score = 0;
    summary = `${offenders.length}/${names.length} tools violate snake_case`;
  }

  const status = score >= 9 ? 'pass' : score >= 5 ? 'warn' : 'fail';

  const details: string[] = [];
  if (offenders.length) {
    details.push(`Non-snake_case names: ${offenders.slice(0, 10).join(', ')}`);
  }
  if (!prefix && offenders.length === 0) {
    details.push('No common prefix — agents discovering many MCPs find prefixed tools easier to disambiguate.');
  }

  const fixes: string[] = [];
  if (offenders.length) fixes.push('Rename tools to lowercase snake_case (a-z, 0-9, _).');
  if (!prefix && offenders.length === 0) {
    fixes.push('Adopt a single prefix per server (e.g. `myserver_*`) so agents can scope discovery.');
  }

  return { id: 'tool_naming', label: 'Tool naming convention', score, status, summary, details, fixes };
}
