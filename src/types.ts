/**
 * Shared types: the snapshot the probe captures and the shape of a check.
 * Kept deliberately minimal so the audit pipeline stays portable.
 */

export interface ToolSnapshot {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
}

export interface ResourceSnapshot {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface PromptSnapshot {
  name: string;
  description?: string;
}

/**
 * What the probe captures from one MCP target. We carry just enough to
 * answer every check without round-tripping back to the target server.
 */
export interface ProbeSnapshot {
  serverInfo: {
    name?: string;
    version?: string;
  };
  tools: ToolSnapshot[];
  resources: ResourceSnapshot[];
  prompts: PromptSnapshot[];
  /** Counted only — never the actual payload (privacy). */
  agentManifest?: {
    has_recommended_first_calls: boolean;
    recommended_first_calls_count: number;
    has_standard_tools: boolean;
    standard_tools_count: number;
    raw_keys: string[];
  };
}

/**
 * Where the audit target's source files live on disk. Some checks (smoke
 * test detection) read from this; the probe only needs `command + args`.
 */
export interface ResolvedTarget {
  /** Display label used in output. */
  displayName: string;
  /** What version, if known. */
  version?: string;
  /** Command to spawn for probe (usually 'node'). */
  command: string;
  /** Args to pass to command. */
  args: string[];
  /** Directory holding the package source — used for file-presence checks. */
  packageDir: string;
  /** package.json contents, if any. */
  packageJson?: Record<string, unknown>;
}

export type CheckId =
  | 'schema_validity'
  | 'tool_naming'
  | 'privacy_modes'
  | 'mutation_gating'
  | 'agent_manifest'
  | 'smoke_test'
  | 'resources'
  | 'tool_descriptions'
  | 'annotations'
  | 'manifest_discoverability'
  // --- web mode (hosted/remote MCP servers + sites) ---
  | 'web_https'
  | 'web_security_headers'
  | 'web_auth_posture'
  | 'web_oauth_discovery'
  | 'web_llms_txt'
  | 'web_mcp_server_card'
  | 'web_agent_skills'
  | 'web_api_catalog'
  | 'web_robots_signals'
  | 'web_structured_data'
  | 'web_exposed_paths'
  | 'web_cors_posture';

/**
 * Snapshot captured from a hosted/remote target over HTTP — the parallel of
 * ProbeSnapshot for the web/security audit path. Pure scorers read this.
 */
export interface WebProbe {
  url: string;
  https: boolean;
  rootStatus: number;
  headers: Record<string, string>;
  llmsTxt: boolean;
  serverCard: boolean;
  serverCardValid: boolean;
  agentSkills: boolean;
  apiCatalog: boolean;
  robotsTxt: boolean;
  aiBotRules: boolean;
  contentSignal: boolean;
  sitemap: boolean;
  oauthProtectedResource: boolean;
  oauthAuthServer: boolean;
  authMd: boolean;
  jsonLd: boolean;
  ogTags: boolean;
  markdownNegotiation: boolean;
  gitExposed: boolean;
  envExposed: boolean;
  securityTxt: boolean;
  corsAllowOrigin: string | null;
  corsAllowCredentials: boolean;
}

export interface CheckResult {
  id: CheckId;
  label: string;
  score: number; // 0..10
  status: 'pass' | 'warn' | 'fail';
  /** One-line headline for the scorecard table. */
  summary: string;
  /** Optional bullets shown in the Details section. */
  details: string[];
  /** Optional suggestions for Suggested fixes section. */
  fixes: string[];
}

export interface AuditReport {
  target: {
    displayName: string;
    version?: string;
    serverName?: string;
    serverVersion?: string;
  };
  totalScore: number; // 0..100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  mode: 'stdio' | 'web';
  checks: CheckResult[];
  generatedAt: string; // ISO timestamp
  scorecardVersion: string;
}

export function toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
}
