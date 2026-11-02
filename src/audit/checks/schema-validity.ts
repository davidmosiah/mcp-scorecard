/**
 * Check 1 — Schema validity.
 *
 * Score = 10 * (tools_with_valid_input_schema / total_tools).
 * Uses ajv to compile each tool's inputSchema. "Valid" means ajv compiles
 * without throwing AND the schema is an object (not primitive).
 */

// ajv's default export gymnastic for ESM + TS: cast through the namespace.
import AjvModule from 'ajv';
import Ajv2019Module from 'ajv/dist/2019.js';
import Ajv2020Module from 'ajv/dist/2020.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = (AjvModule as any).default ?? AjvModule;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2019 = (Ajv2019Module as any).default ?? Ajv2019Module;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2020 = (Ajv2020Module as any).default ?? Ajv2020Module;
import type { CheckResult, ProbeSnapshot } from '../../types.js';

export function checkSchemaValidity(snapshot: ProbeSnapshot): CheckResult {
  const tools = snapshot.tools;
  // Preserve the existing unknown-format/extension policy. Each supported
  // dialect still uses its actual meta-schema; unknown dialects fail closed.
  const options = { strict: false, allErrors: true, logger: false, validateSchema: true };
  const validators = {
    draft07: new Ajv(options),
    draft2019: new Ajv2019(options),
    draft2020: new Ajv2020(options)
  };

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
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object' || Array.isArray(tool.inputSchema)) {
      broken.push(`${tool.name}: missing or non-object inputSchema`);
      continue;
    }
    try {
      const dialect = (tool.inputSchema as Record<string, unknown>).$schema;
      let validator;
      if (dialect === undefined || dialect === 'http://json-schema.org/draft-07/schema' || dialect === 'http://json-schema.org/draft-07/schema#') {
        validator = validators.draft07;
      } else if (dialect === 'https://json-schema.org/draft/2019-09/schema' || dialect === 'https://json-schema.org/draft/2019-09/schema#') {
        validator = validators.draft2019;
      } else if (dialect === 'https://json-schema.org/draft/2020-12/schema' || dialect === 'https://json-schema.org/draft/2020-12/schema#') {
        validator = validators.draft2020;
      } else {
        throw new Error('Unsupported or invalid JSON Schema dialect; use draft-07, 2019-09, or 2020-12');
      }
      validator.compile(tool.inputSchema);
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
      ? ['Register a valid JSON Schema object as inputSchema using draft-07, 2019-09, or 2020-12; declare the matching $schema URI.']
      : []
  };
}
