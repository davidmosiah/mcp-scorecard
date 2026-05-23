/**
 * Check 1 — Schema validity.
 *
 * Score = 10 * (tools_with_valid_input_schema / total_tools).
 * Uses ajv to compile each tool's inputSchema. "Valid" means ajv compiles
 * without throwing AND the schema is an object (not primitive).
 */

// ajv's default export gymnastic for ESM + TS: cast through the namespace.
import AjvModule from 'ajv';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = (AjvModule as any).default ?? AjvModule;
import type { CheckResult, ProbeSnapshot } from '../../types.js';

export function checkSchemaValidity(snapshot: ProbeSnapshot): CheckResult {
  const tools = snapshot.tools;
  // strict:false + logger:false keeps ajv from writing "unknown format"
  // warnings to stderr when MCP schemas use date-time, uri, etc. without
  // registering ajv-formats.
  const ajv = new Ajv({ strict: false, allErrors: true, logger: false });

  if (tools.length === 0) {
    return {
      id: 'schema_validity',
      label: 'Schema validity',
      score: 0,
      status: 'fail',
      summary: 'no tools to validate',
      details: ['Target exposed zero tools.'],
      fixes: ['Register at least one tool with a valid JSON Schema.']
    };
  }

  const broken: string[] = [];
  let valid = 0;
  for (const tool of tools) {
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      broken.push(`${tool.name}: missing or non-object inputSchema`);
      continue;
    }
    try {
      ajv.compile(tool.inputSchema);
      valid += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      broken.push(`${tool.name}: ${msg.slice(0, 120)}`);
    }
  }

  const score = Math.round((valid / tools.length) * 10);
  const status = score >= 9 ? 'pass' : score >= 6 ? 'warn' : 'fail';

  return {
    id: 'schema_validity',
    label: 'Schema validity',
    score,
    status,
    summary: `${valid}/${tools.length} tools have valid input schema`,
    details: broken.slice(0, 10).map((b) => `Invalid schema: ${b}`),
    fixes: broken.length
      ? ['Ensure every tool registers a JSON Schema object as inputSchema (zod-to-json-schema works well).']
      : []
  };
}
