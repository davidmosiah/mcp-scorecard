/**
 * Check — Dense/stream-like tools must advertise hard caps and series contract
 * (agent-safe-series/v1 discipline).
 *
 * Hard cap (inventory #19): `max_points` / `maxPoints` must appear in
 * **inputSchema.properties**. Description-only contract text does NOT count as a cap.
 *
 * Contract marker (OSS-300 #13): `contract_version` must appear as a **schema
 * property** on inputSchema or outputSchema. Description-only
 * `agent-safe-series/v1` text does not count.
 */
import type { CheckResult, ProbeSnapshot } from '../../types.js';

const DENSE_NAME = /(stream|series|intraday|continuous|sample|samples|ppi)/i;
/** Cap signals only — never agent-safe-series (that is the contract marker). */
const CAP_HINT = /(max_points|maxPoints|resolution_seconds|point budget|hard cap|downsample)/i;

function schemaProps(schema: unknown): Record<string, unknown> {
  return (schema as { properties?: Record<string, unknown> } | undefined)?.properties ?? {};
}

function toolInputProps(tool: { inputSchema?: unknown }): Record<string, unknown> {
  return schemaProps(tool.inputSchema);
}

/** Hard cap requires max_points/maxPoints on the input schema properties. */
function hasHardCap(tool: { description?: string; inputSchema?: unknown }): boolean {
  const props = toolInputProps(tool);
  return props.max_points != null || props.maxPoints != null;
}

function hasContractVersionProp(schema: unknown): boolean {
  const props = schemaProps(schema);
  return props.contract_version != null || props.contractVersion != null;
}

function hasContractMarker(tool: {
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}): boolean {
  return hasContractVersionProp(tool.outputSchema) || hasContractVersionProp(tool.inputSchema);
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
      summary: `${dense.length} dense tool(s) have schema max_points + series contract markers`,
      details: dense.map((t) => t.name),
      fixes: []
    };
  }

  const issues = dense.length * 2;
  const failed = missingCap.length + missingContract.length;
  const ratio = (issues - failed) / issues;
  const score = ratio >= 0.75 ? 7 : ratio >= 0.5 ? 5 : 0;
  const details = [
    ...missingCap.map((n) => `missing hard cap (max_points in inputSchema.properties): ${n}`),
    ...missingContract.map((n) => `missing schema property contract_version (outputSchema or inputSchema): ${n}`)
  ];
  return {
    id: 'dense_series_caps',
    label: 'Dense series caps',
    score,
    status: score === 0 ? 'fail' : 'warn',
    summary: `${failed} dense-series gaps across ${dense.length} tool(s)`,
    details,
    fixes: [
      'For stream/series tools: put max_points in inputSchema.properties (required hard cap).',
      'Put contract_version on outputSchema.properties (envelope) or inputSchema.properties. Description-only agent-safe-series text is not enough.'
    ]
  };
}

// CAP_HINT kept for documentation/tests that assert cap language is distinct from contract.
export const _denseSeriesCapHintForTests = CAP_HINT;
