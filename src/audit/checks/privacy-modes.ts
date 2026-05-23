/**
 * Check 3 — Privacy modes documented.
 *
 * Two signals:
 *   1. any tool input schema has a `privacy_mode` property
 *   2. any tool description mentions "summary|structured|raw" as modes
 *
 * Score:
 *   10 — privacy_mode parameter is on >=1 tool
 *    7 — >=3 tools mention summary/structured/raw in descriptions
 *    4 — exactly 1-2 tools mention them
 *    0 — no signal at all
 *
 * We look at the probe snapshot only — no source-file scraping needed.
 */

import type { CheckResult, ProbeSnapshot } from '../../types.js';

const MODE_RE = /\b(summary|structured|raw)\b/i;

function hasPrivacyModeParam(inputSchema: unknown): boolean {
  if (!inputSchema || typeof inputSchema !== 'object') return false;
  const props = (inputSchema as Record<string, unknown>).properties;
  if (!props || typeof props !== 'object') return false;
  return 'privacy_mode' in (props as object) || 'privacyMode' in (props as object);
}

export function checkPrivacyModes(snapshot: ProbeSnapshot): CheckResult {
  const tools = snapshot.tools;
  const withParam = tools.filter((t) => hasPrivacyModeParam(t.inputSchema));
  const mentioning = tools.filter((t) => t.description && MODE_RE.test(t.description));

  let score: number;
  let summary: string;
  if (withParam.length >= 1) {
    score = 10;
    summary = `privacy_mode parameter on ${withParam.length} tool(s)`;
  } else if (mentioning.length >= 3) {
    score = 7;
    summary = `${mentioning.length} tools document summary/structured/raw modes`;
  } else if (mentioning.length >= 1) {
    score = 4;
    summary = `only ${mentioning.length} tool(s) mention privacy modes`;
  } else {
    score = 0;
    summary = 'no privacy modes documented';
  }

  const status = score >= 9 ? 'pass' : score >= 5 ? 'warn' : 'fail';

  const fixes: string[] = [];
  if (score < 10) {
    fixes.push(
      'Add a `privacy_mode` parameter (summary | structured | raw) on read tools so agents can request only what they need.'
    );
  }

  return {
    id: 'privacy_modes',
    label: 'Privacy modes documented',
    score,
    status,
    summary,
    details: [],
    fixes
  };
}
