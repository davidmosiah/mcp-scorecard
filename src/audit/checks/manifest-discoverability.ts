/**
 * Check 10 — Manifest discoverability.
 *
 * Server gets full credit if it exposes ANY of:
 *   *_agent_manifest, *_data_inventory, *_capabilities, *_connection_status
 *
 * Score:
 *   10 — has 2+ of these tools
 *    7 — has exactly 1
 *    0 — has none
 */

import { DISCOVERY_TOOL_SUFFIXES } from '../../constants.js';
import type { CheckResult, ProbeSnapshot } from '../../types.js';

function matchesSuffix(name: string, suffix: string): boolean {
  return name === suffix || name.endsWith(`_${suffix}`);
}

export function checkManifestDiscoverability(snapshot: ProbeSnapshot): CheckResult {
  const present = DISCOVERY_TOOL_SUFFIXES.filter((suf) =>
    snapshot.tools.some((t) => matchesSuffix(t.name, suf))
  );

  let score: number;
  let status: CheckResult['status'];
  if (present.length >= 2) {
    score = 10;
    status = 'pass';
  } else if (present.length === 1) {
    score = 7;
    status = 'warn';
  } else {
    score = 0;
    status = 'fail';
  }

  const fixes: string[] = [];
  if (score < 10) {
    fixes.push(
      'Expose discovery tools so agents can self-onboard: `*_agent_manifest`, `*_data_inventory`, `*_capabilities`, `*_connection_status`.'
    );
  }

  return {
    id: 'manifest_discoverability',
    label: 'Manifest discoverability',
    score,
    status,
    summary: present.length
      ? `${present.length}/${DISCOVERY_TOOL_SUFFIXES.length} discovery tools present (${present.join(', ')})`
      : 'no discovery tools',
    details: [],
    fixes
  };
}
