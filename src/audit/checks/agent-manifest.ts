/**
 * Check 5 — Agent manifest.
 *
 * The probe already attempted to call `*_agent_manifest`. We grade what
 * came back:
 *   10 — recommended_first_calls (length > 0) AND standard_tools (length > 0)
 *    7 — has one of those two
 *    3 — manifest tool exists but returned an unusable shape
 *    0 — no manifest tool at all
 */

import type { CheckResult, ProbeSnapshot } from '../../types.js';

export function checkAgentManifest(snapshot: ProbeSnapshot): CheckResult {
  const hasManifestTool = snapshot.tools.some((t) => /(^|_)agent_manifest$/.test(t.name));
  const manifest = snapshot.agentManifest;

  if (!hasManifestTool) {
    return {
      id: 'agent_manifest',
      label: 'Agent manifest',
      score: 0,
      status: 'fail',
      summary: 'no agent_manifest tool',
      details: [],
      fixes: [
        'Expose a `<prefix>_agent_manifest` tool that returns { recommended_first_calls, standard_tools, ... } so agents can self-onboard.'
      ]
    };
  }

  if (!manifest) {
    return {
      id: 'agent_manifest',
      label: 'Agent manifest',
      score: 3,
      status: 'fail',
      summary: 'agent_manifest tool present but call failed',
      details: ['Calling the manifest tool did not return parseable JSON.'],
      fixes: ['Ensure `<prefix>_agent_manifest` returns text content containing JSON with recommended_first_calls + standard_tools.']
    };
  }

  const hasFC = manifest.has_recommended_first_calls && manifest.recommended_first_calls_count > 0;
  const hasST = manifest.has_standard_tools && manifest.standard_tools_count > 0;

  let score: number;
  let summary: string;
  if (hasFC && hasST) {
    score = 10;
    summary = `recommended_first_calls present (${manifest.recommended_first_calls_count} entries)`;
  } else if (hasFC || hasST) {
    score = 7;
    summary = hasFC
      ? 'recommended_first_calls present; standard_tools missing'
      : 'standard_tools present; recommended_first_calls missing';
  } else {
    score = 3;
    summary = 'agent_manifest returned object but no expected arrays';
  }

  const status = score >= 9 ? 'pass' : score >= 5 ? 'warn' : 'fail';

  const fixes: string[] = [];
  if (!hasFC) fixes.push('Add `recommended_first_calls: [...]` to the manifest response.');
  if (!hasST) fixes.push('Add `standard_tools: [...]` to the manifest response.');

  return {
    id: 'agent_manifest',
    label: 'Agent manifest',
    score,
    status,
    summary,
    details: [],
    fixes
  };
}
