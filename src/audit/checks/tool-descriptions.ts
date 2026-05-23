/**
 * Check 8 — Tool descriptions.
 *
 * Average `description` length:
 *   < 30  → 0
 *   30-60 → 5
 *   60+   → 10
 *
 * Missing descriptions count as 0 chars in the average, then we also flag
 * the names with no description at all.
 */

import type { CheckResult, ProbeSnapshot } from '../../types.js';

export function checkToolDescriptions(snapshot: ProbeSnapshot): CheckResult {
  const tools = snapshot.tools;
  if (tools.length === 0) {
    return {
      id: 'tool_descriptions',
      label: 'Tool descriptions',
      score: 0,
      status: 'fail',
      summary: 'no tools',
      details: [],
      fixes: []
    };
  }

  const lengths = tools.map((t) => (t.description ?? '').length);
  const missing = tools.filter((t) => !t.description || t.description.length === 0).map((t) => t.name);
  const avg = lengths.reduce((s, n) => s + n, 0) / tools.length;

  let score: number;
  let status: CheckResult['status'];
  if (avg >= 60) {
    score = 10;
    status = 'pass';
  } else if (avg >= 30) {
    score = 5;
    status = 'warn';
  } else {
    score = 0;
    status = 'fail';
  }

  const details: string[] = [];
  if (missing.length) details.push(`Missing descriptions: ${missing.slice(0, 10).join(', ')}`);

  const fixes: string[] = [];
  if (score < 10) {
    fixes.push(
      'Write a one-paragraph description per tool that names the inputs, the output shape, and any side effects.'
    );
  }

  return {
    id: 'tool_descriptions',
    label: 'Tool descriptions',
    score,
    status,
    summary: `avg ${avg.toFixed(0)} chars across ${tools.length} tool${tools.length === 1 ? '' : 's'}`,
    details,
    fixes
  };
}
