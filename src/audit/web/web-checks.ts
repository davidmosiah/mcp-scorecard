/**
 * Web checks — pure scorers over a WebProbe. Ten dimensions, each 0–10, for
 * hosted/remote MCP servers + sites: security posture + agent-readiness
 * (the discovery signals agents and crawlers actually look for).
 */
import type { CheckId, CheckResult, WebProbe } from '../../types.js';

const SEC_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options'
];

function mk(id: CheckId, label: string, score: number, summary: string, fixes: string[] = [], details: string[] = []): CheckResult {
  const s = Math.max(0, Math.min(10, Math.round(score)));
  return { id, label, score: s, status: s >= 8 ? 'pass' : s >= 4 ? 'warn' : 'fail', summary, details, fixes };
}

export function scoreWeb(p: WebProbe): CheckResult[] {
  const present = SEC_HEADERS.filter((h) => p.headers[h]);
  const authClear = p.authMd || p.oauthProtectedResource || p.oauthAuthServer;
  const oauth = p.oauthProtectedResource || p.oauthAuthServer;

  return [
    mk('web_https', 'HTTPS / TLS', p.https ? 10 : 0,
      p.https ? 'served over HTTPS' : 'NOT served over HTTPS',
      p.https ? [] : ['Serve the MCP server / site over HTTPS only.']),

    mk('web_security_headers', 'Security headers', (present.length / SEC_HEADERS.length) * 10,
      `${present.length}/${SEC_HEADERS.length} hardening headers present`,
      present.length >= 4 ? [] : [`Add missing headers: ${SEC_HEADERS.filter((h) => !p.headers[h]).join(', ')}.`]),

    mk('web_auth_posture', 'Auth posture declared', authClear ? 10 : 3,
      authClear ? 'auth posture is explicit (auth.md / OAuth metadata)' : 'auth posture unclear — agents cannot tell how to authenticate',
      authClear ? [] : ['Publish /auth.md (even "no auth required") or OAuth discovery metadata so agents know how to connect.']),

    mk('web_oauth_discovery', 'OAuth discovery', oauth ? 10 : p.authMd ? 7 : 0,
      oauth ? 'OAuth/OIDC discovery metadata present' : p.authMd ? 'no OAuth, but auth.md declares the (no-auth) posture' : 'no OAuth/OIDC discovery metadata',
      oauth || p.authMd ? [] : ['If the server has protected APIs, publish /.well-known/oauth-protected-resource (+ oauth-authorization-server).']),

    mk('web_llms_txt', 'llms.txt', p.llmsTxt ? 10 : 0,
      p.llmsTxt ? '/llms.txt present and substantive' : '/llms.txt missing',
      p.llmsTxt ? [] : ['Add /llms.txt describing the server, install command, tools and links for LLMs.']),

    mk('web_mcp_server_card', 'MCP Server Card', p.serverCardValid ? 10 : p.serverCard ? 5 : 0,
      p.serverCardValid ? '/.well-known/mcp/server-card.json present and valid' : p.serverCard ? 'server card present but missing serverInfo' : 'MCP Server Card missing',
      p.serverCardValid ? [] : ['Serve /.well-known/mcp/server-card.json (SEP-1649) with serverInfo, transport and capabilities.']),

    mk('web_agent_skills', 'Agent Skills index', p.agentSkills ? 10 : 0,
      p.agentSkills ? '/.well-known/agent-skills/index.json present' : 'Agent Skills discovery index missing',
      p.agentSkills ? [] : ['Publish /.well-known/agent-skills/index.json (Agent Skills Discovery RFC) listing your skills.']),

    mk('web_api_catalog', 'API catalog (RFC 9727)', p.apiCatalog ? 10 : 0,
      p.apiCatalog ? '/.well-known/api-catalog present' : 'API catalog missing',
      p.apiCatalog ? [] : ['Publish /.well-known/api-catalog (application/linkset+json) pointing to your OpenAPI / docs / status.']),

    mk('web_robots_signals', 'robots + AI signals',
      (p.robotsTxt ? 4 : 0) + (p.aiBotRules ? 2 : 0) + (p.contentSignal ? 2 : 0) + (p.sitemap ? 2 : 0),
      `robots:${p.robotsTxt ? 'y' : 'n'} ai-bots:${p.aiBotRules ? 'y' : 'n'} content-signal:${p.contentSignal ? 'y' : 'n'} sitemap:${p.sitemap ? 'y' : 'n'}`,
      (p.robotsTxt && p.aiBotRules && p.contentSignal && p.sitemap) ? [] : ['robots.txt with explicit AI-bot rules + a Content-Signal directive + a Sitemap line.']),

    mk('web_structured_data', 'Structured metadata',
      (p.jsonLd ? 4 : 0) + (p.ogTags ? 3 : 0) + (p.markdownNegotiation ? 3 : 0),
      `json-ld:${p.jsonLd ? 'y' : 'n'} og:${p.ogTags ? 'y' : 'n'} markdown-for-agents:${p.markdownNegotiation ? 'y' : 'n'}`,
      (p.jsonLd && p.ogTags && p.markdownNegotiation) ? [] : ['Add JSON-LD (schema.org), OpenGraph tags, and Markdown-for-Agents (Accept: text/markdown).']),

    mk('web_exposed_paths', 'No exposed secrets', (p.gitExposed || p.envExposed) ? 0 : 10,
      (p.gitExposed || p.envExposed)
        ? `CRITICAL: ${[p.gitExposed && '/.git/config', p.envExposed && '/.env'].filter(Boolean).join(' + ')} is publicly readable`
        : 'no /.git or /.env exposed' + (p.securityTxt ? ' (+ security.txt present)' : ''),
      (p.gitExposed || p.envExposed) ? ['URGENT: block public access to /.git and /.env — they leak source history and credentials.'] : []),

    mk('web_cors_posture', 'CORS posture',
      (p.corsAllowCredentials && (p.corsAllowOrigin === '*' || /mcp-scorecard\.test/.test(p.corsAllowOrigin || ''))) ? 2 : 10,
      (p.corsAllowCredentials && (p.corsAllowOrigin === '*' || /mcp-scorecard\.test/.test(p.corsAllowOrigin || '')))
        ? 'DANGEROUS: credentials allowed with wildcard/reflected origin'
        : `safe (allow-origin: ${p.corsAllowOrigin ?? 'none'}, credentials: ${p.corsAllowCredentials})`,
      (p.corsAllowCredentials && (p.corsAllowOrigin === '*' || /mcp-scorecard\.test/.test(p.corsAllowOrigin || ''))) ? ['Never combine Access-Control-Allow-Credentials:true with a wildcard or reflected Access-Control-Allow-Origin.'] : [])
  ];
}
