/**
 * Check 9 — Annotations.
 *
 * Counts what fraction of read tools (any non-mutation tool name) carry the
 * MCP 1.20+ `annotations.readOnlyHint` field. Score = 10 * (annotated / read).
 *
 * If no read tools exist (rare — server is pure write) → score = 10 (n/a).
 */

import { MUTATION_PATTERNS } from '../../constants.js';
import type { CheckResult, ProbeSnapshot } from '../../types.js';

function isReadTool(name: string): boolean {
  return !MUTATION_PATTERNS.some((p) => p.test(name));
}

function hasReadOnlyHint(annotations: Record<string, unknown> | undefined): boolean {
  if (!annotations) return false;
  const v = annotations.readOnlyHint;
  return v === true;
}

export function checkAnnotations(snapshot: ProbeSnapshot): CheckResult {
  const readTools = snapshot.tools.filter((t) => isReadTool(t.name));
  if (readTools.length === 0) {
    return {
      id: 'annotations',
      label: 'Annotations',
      score: 10,
      status: 'pass',
      summary: 'no read tools — n/a',
      details: [],
      fixes: []
    };
  }

  const annotated = readTools.filter((t) => hasReadOnlyHint(t.annotations));
  const missing = readTools.filter((t) => !hasReadOnlyHint(t.annotations)).map((t) => t.name);
  const score = Math.round((annotated.length / readTools.length) * 10);
  const status = score >= 9 ? 'pass' : score >= 5 ? 'warn' : 'fail';

  const details: string[] = [];
  if (missing.length) {
    details.push(`Missing readOnlyHint: ${missing.slice(0, 10).join(', ')}`);
  }

  const fixes: string[] = [];
  if (score < 10) {
    fixes.push(
      'Add `annotations: { readOnlyHint: true, openWorldHint: false }` to every read tool definition.'
    );
  }

  return {
    id: 'annotations',
    label: 'Annotations',
    score,
    status,
    summary: `${annotated.length}/${readTools.length} read tools annotated`,
    details,
    fixes
  };
}
