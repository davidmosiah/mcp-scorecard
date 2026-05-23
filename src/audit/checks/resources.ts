/**
 * Check 7 — Resources advertised.
 *
 * Score from count of MCP resources returned by listResources():
 *   0   resources → 0
 *   1-2 resources → 5
 *   3+  resources → 10
 */

import type { CheckResult, ProbeSnapshot } from '../../types.js';

export function checkResources(snapshot: ProbeSnapshot): CheckResult {
  const count = snapshot.resources.length;
  let score: number;
  let status: CheckResult['status'];
  if (count >= 3) {
    score = 10;
    status = 'pass';
  } else if (count >= 1) {
    score = 5;
    status = 'warn';
  } else {
    score = 0;
    status = 'fail';
  }

  const fixes: string[] = [];
  if (count < 3) {
    fixes.push(
      'Register MCP resources (e.g. `whoop://summary/daily`, `whoop://agent-manifest`) so agents can subscribe to context instead of polling tools.'
    );
  }

  return {
    id: 'resources',
    label: 'Resources advertised',
    score,
    status,
    summary: `${count} resource${count === 1 ? '' : 's'} registered`,
    details: [],
    fixes
  };
}
