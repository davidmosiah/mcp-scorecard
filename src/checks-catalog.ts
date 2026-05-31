/**
 * Single source of truth for every check: category + why it matters.
 * Powers `--profile` (filter by category) and the site's /checks explainer page.
 */
import type { CheckId } from './types.js';

export type Category = 'quality' | 'security' | 'agent-ready';

export interface CheckMeta {
  label: string;
  category: Category;
  why: string;
}

export const CHECK_META: Record<CheckId, CheckMeta> = {
  // --- stdio: protocol quality ---
  schema_validity: { label: 'Schema validity', category: 'quality', why: 'Agents reject or mis-call tools whose input schemas are invalid or missing.' },
  tool_naming: { label: 'Tool naming', category: 'quality', why: 'Consistent snake_case verb_noun names make tools predictable for models to select.' },
  tool_descriptions: { label: 'Tool descriptions', category: 'quality', why: 'Rich descriptions are the only thing a model has to decide when/how to call a tool.' },
  annotations: { label: 'Annotations', category: 'quality', why: 'readOnly/destructive hints let agents reason about safety before calling.' },
  resources: { label: 'Resources advertised', category: 'quality', why: 'Exposing resources lets agents pull context without bespoke tool calls.' },
  smoke_test: { label: 'Smoke test', category: 'quality', why: 'A smoke script proves the server actually boots — the baseline of trust.' },
  mutation_gating: { label: 'Mutation gating', category: 'security', why: 'State-changing tools must document/guard side effects so agents do not mutate blindly.' },
  privacy_modes: { label: 'Privacy modes', category: 'security', why: 'A privacy_mode parameter lets agents request non-sensitive responses.' },
  agent_manifest: { label: 'Agent manifest', category: 'agent-ready', why: 'recommended_first_calls tells an agent how to start — the onboarding contract.' },
  manifest_discoverability: { label: 'Manifest discoverability', category: 'agent-ready', why: 'Standard discovery tools (capabilities, inventory) let agents self-orient.' },
  // --- web: hosted/remote ---
  web_https: { label: 'HTTPS / TLS', category: 'security', why: 'Plaintext HTTP exposes tokens and tool traffic to interception.' },
  web_security_headers: { label: 'Security headers', category: 'security', why: 'HSTS/CSP/X-Content-Type-Options harden the server against common web attacks.' },
  web_auth_posture: { label: 'Auth posture declared', category: 'security', why: 'Agents cannot connect safely if they cannot tell whether/how to authenticate.' },
  web_oauth_discovery: { label: 'OAuth discovery', category: 'security', why: 'Standard OAuth metadata lets agents programmatically obtain access.' },
  web_exposed_paths: { label: 'No exposed secrets', category: 'security', why: 'A public /.git or /.env leaks source history and live credentials — critical.' },
  web_cors_posture: { label: 'CORS posture', category: 'security', why: 'Wildcard + credentials CORS is a classic data-exfiltration misconfiguration.' },
  web_llms_txt: { label: 'llms.txt', category: 'agent-ready', why: 'A concise machine summary tells LLMs what the server is and how to use it.' },
  web_mcp_server_card: { label: 'MCP Server Card', category: 'agent-ready', why: 'The /.well-known card is how agents discover the server, transport and tools.' },
  web_agent_skills: { label: 'Agent Skills index', category: 'agent-ready', why: 'The skills discovery index lets agents find and verify your capabilities.' },
  web_api_catalog: { label: 'API catalog (RFC 9727)', category: 'agent-ready', why: 'A standard catalog points agents to your OpenAPI, docs and status.' },
  web_robots_signals: { label: 'robots + AI signals', category: 'agent-ready', why: 'Explicit AI-bot rules + Content-Signal declare how agents may use your content.' },
  web_structured_data: { label: 'Structured metadata', category: 'agent-ready', why: 'JSON-LD, OpenGraph and Markdown-for-Agents make the page machine-legible.' }
};

export const PROFILES: Record<string, { label: string; categories: Category[] }> = {
  all: { label: 'All checks', categories: ['quality', 'security', 'agent-ready'] },
  security: { label: 'Security', categories: ['security'] },
  quality: { label: 'Protocol quality', categories: ['quality'] },
  'agent-ready': { label: 'Agent-readiness', categories: ['agent-ready'] }
};
