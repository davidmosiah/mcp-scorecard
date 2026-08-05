/**
 * Check — Dense/stream-like tools should advertise max_points / resolution caps
 * in the tool description or input schema (agent-safe-series discipline).
 */
import type { CheckResult, ProbeSnapshot } from '../../types.js';

const DENSE_NAME = /(stream|series|intraday|continuous|sample|samples|ppi)/i;
const CAP_HINT = /(max_points|resolution_seconds|maxPoints|point budget|agent-safe-series|hard cap|downsample)/i;

export function checkDenseSeriesCaps(snapshot: ProbeSnapshot): CheckResult {
  const dense = snapshot.tools.filter((t) => DENSE_NAME.test(t.name));
  if (dense.length === 0) {
    return {
      id: 'dense_series_caps',
      label: 'Dense series caps',
      score: 10,
      status: 'pass',
      summary: 'no dense/stream tools detected',
      details: [],
      fixes: []
    };
  }

  const missing: string[] = [];
  for (const tool of dense) {
    const desc = tool.description ?? '';
    const schemaText = JSON.stringify(tool.inputSchema ?? {});
    if (!CAP_HINT.test(desc) && !CAP_HINT.test(schemaText)) missing.push(tool.name);
  }

  if (missing.length === 0) {
    return {
      id: 'dense_series_caps',
      label: 'Dense series caps',
      score: 10,
      status: 'pass',
      summary: `${dense.length} dense tool(s) document point/resolution caps`,
      details: dense.map((t) => t.name),
      fixes: []
    };
  }

  const ratio = (dense.length - missing.length) / dense.length;
  const score = ratio >= 0.5 ? 5 : 0;
  return {
    id: 'dense_series_caps',
    label: 'Dense series caps',
    score,
    status: score === 0 ? 'fail' : 'warn',
    summary: `${missing.length}/${dense.length} dense tools lack max_points/resolution hints`,
    details: missing.map((n) => `missing cap docs: ${n}`),
    fixes: [
      'For stream/series/intraday tools, document max_points and resolution_seconds (agent-safe-series/v1) in description or input schema.'
    ]
  };
}
