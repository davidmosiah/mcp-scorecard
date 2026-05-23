/**
 * Version pinned in source so the audit output and probe handshake show the
 * same string. Bumping this without updating package.json is intentional during
 * dev (keep src as source of truth); a release script can sync them.
 */
export const SERVER_VERSION = '0.1.0';

/** Identifier used when the probe connects to a target MCP server. */
export const PROBE_CLIENT_NAME = 'mcp-scorecard';

/** Env var set on the spawned target so MCP authors can detect we are probing
 *  and skip auth-only side effects. Documented in the README. */
export const PROBE_ENV_FLAG = 'MCP_PROBE';

/**
 * Patterns that imply a tool MUTATES state on the target system. We use these
 * to score mutation gating — if a tool name matches and the description does
 * not mention an explicit gate, it loses points.
 */
export const MUTATION_PATTERNS: RegExp[] = [
  /(^|_)(set|update|delete|create|pause|resume|enable|disable|cancel|publish|send|remove|add|insert|patch|put|post)(_|$)/i
];

/**
 * Words that, when present in a mutation tool's description, signal the author
 * thought about gating: env vars, explicit consent, dry-run, etc.
 */
export const MUTATION_GATE_HINTS = [
  'gated by',
  'requires explicit',
  'explicit user intent',
  'allow_mutations',
  'dry-run',
  'dry_run',
  'confirm',
  'consent'
];

/** Manifest-discoverability candidates — at least one must exist on target. */
export const DISCOVERY_TOOL_SUFFIXES = [
  'agent_manifest',
  'data_inventory',
  'capabilities',
  'connection_status'
];

/** Field names that, if echoed back in tool descriptions, are redacted in
 *  output to avoid leaking real customer data when run against a logged-in
 *  server. */
export const REDACTION_KEYS = [
  'customer_id',
  'email',
  'phone',
  'access_token',
  'refresh_token',
  'client_secret',
  'developer_token',
  'api_key'
];
