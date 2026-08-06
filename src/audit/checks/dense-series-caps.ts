/**
 * Check — Dense/stream-like tools must advertise hard caps and series contract
 * (agent-safe-series/v1 discipline).
 *
 * Prefer schema properties: `max_points` (hard cap) and contract markers
 * (`contract_version` property and/or `agent-safe-series` in description/schema).
 */
import type { CheckResult, ProbeSnapshot } from '../../types.js';

const DENSE_NAME = /(stream|series|intraday|continuous|sample|samples|ppi)/i;
const CAP_HINT = /(max_points|resolution_seconds|maxPoints|point budget|agent-safe-series|hard cap|downsample)/i;
const CONTRACT_HINT = /(contract_version|agent-safe-series\/v\d+|agent-safe-series)/i;

function schemaProps(tool: { inputSchema?: unknown }): Record<string, unknown> {
  const schema = tool.inputSchema as { properties?: Record<string, unknown> } | undefined;
  return schema?.properties ?? {};
}

function hasHardCap(tool: { description?: string; inputSchema?: unknown }): boolean {
  const props = schemaProps(tool);
  if (props.max_points != null || props.maxPoints != null) return true;
  const desc = tool.description ?? '';
  const schemaText = JSON.stringify(tool.inputSchema ?? {});
  return CAP_HINT.test(desc) || CAP_HINT.test(schemaText);
}

function hasContractMarker(tool: { description?: string; inputSchema?: unknown }): boolean {
  const props = schemaProps(tool);
  if (props.contract_version != null || props.contractVersion != null) return true;
  const desc = tool.description ?? '';
  const schemaText = JSON.stringify(tool.inputSchema ?? {});
  return CONTRACT_HINT.test(desc) || CONTRACT_HINT.test(schemaText);
}

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

  const missingCap: string[] = [];
  const missingContract: string[] = [];
  for (const tool of dense) {
    if (!hasHardCap(tool)) missingCap.push(tool.name);
    if (!hasContractMarker(tool)) missingContract.push(tool.name);
  }

  if (missingCap.length === 0 && missingContract.length === 0) {
    return {
      id: 'dense_series_caps',
      label: 'Dense series caps',
      score: 10,
      status: 'pass',
      summary: `${dense.length} dense tool(s) document hard caps + series contract markers`,
      details: dense.map((t) => t.name),
      fixes: []
    };
  }

  const issues = dense.length * 2;
  const failed = missingCap.length + missingContract.length;
  const ratio = (issues - failed) / issues;
  const score = ratio >= 0.75 ? 7 : ratio >= 0.5 ? 5 : 0;
  const details = [
    ...missingCap.map((n) => `missing hard cap (max_points in schema or description): ${n}`),
    ...missingContract.map((n) => `missing contract_version / agent-safe-series marker: ${n}`)
  ];
  return {
    id: 'dense_series_caps',
    label: 'Dense series caps',
    score,
    status: score === 0 ? 'fail' : 'warn',
    summary: `${failed} dense-series gaps across ${dense.length} tool(s)`,
    details,
    fixes: [
      'For stream/series tools: put max_points in inputSchema.properties (hard cap).',
      'Advertise agent-safe-series/v1 and/or contract_version in description or schema (agent-safe-series/v1).'
    ]
  };
}
