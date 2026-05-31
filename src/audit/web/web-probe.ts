/**
 * Web probe — captures discovery + security signals from a hosted/remote MCP
 * server or site over HTTP. Resilient: every fetch failure degrades to a
 * negative signal rather than throwing. Pure scorers (web-checks) read the result.
 */
import type { WebProbe } from '../../types.js';

const UA = 'mcp-scorecard/0.2 (+https://mcp-scorecard.vercel.app)';

async function get(url: string, opts: { timeoutMs?: number; accept?: string } = {}): Promise<{ status: number; text: string; headers: Record<string, string> } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: opts.accept ?? '*/*' }
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    let text = '';
    try { text = await res.text(); } catch { /* binary / empty */ }
    return { status: res.status, text, headers };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const ok = (r: { status: number } | null) => !!r && r.status >= 200 && r.status < 400;

export async function fetchWebProbe(rawUrl: string): Promise<WebProbe> {
  const base = rawUrl.replace(/\/+$/, '');
  const u = new URL(base);
  const at = (p: string) => `${u.origin}${p}`;

  const [root, llms, robots, card, skills, apiCat, sitemap, oauthPR, oauthAS, authMd, mdNeg] = await Promise.all([
    get(base + '/'),
    get(at('/llms.txt')),
    get(at('/robots.txt')),
    get(at('/.well-known/mcp/server-card.json')),
    get(at('/.well-known/agent-skills/index.json')),
    get(at('/.well-known/api-catalog')),
    get(at('/sitemap.xml')),
    get(at('/.well-known/oauth-protected-resource')),
    get(at('/.well-known/oauth-authorization-server')),
    get(at('/auth.md')),
    get(base + '/', { accept: 'text/markdown' })
  ]);

  const robotsText = ok(robots) ? robots!.text.toLowerCase() : '';
  const rootHtml = ok(root) ? root!.text : '';

  let serverCardValid = false;
  if (ok(card)) {
    try { serverCardValid = !!JSON.parse(card!.text)?.serverInfo; } catch { serverCardValid = false; }
  }

  return {
    url: base,
    https: u.protocol === 'https:',
    rootStatus: root?.status ?? 0,
    headers: root?.headers ?? {},
    llmsTxt: ok(llms) && llms!.text.trim().length > 20,
    serverCard: ok(card),
    serverCardValid,
    agentSkills: ok(skills),
    apiCatalog: ok(apiCat),
    robotsTxt: ok(robots),
    aiBotRules: /gptbot|claudebot|claude-web|perplexitybot|google-extended|anthropic-ai/.test(robotsText),
    contentSignal: /content-signal/.test(robotsText),
    sitemap: ok(sitemap),
    oauthProtectedResource: ok(oauthPR),
    oauthAuthServer: ok(oauthAS),
    authMd: ok(authMd) && /auth\.md/i.test(authMd!.text),
    jsonLd: /application\/ld\+json/i.test(rootHtml),
    ogTags: /property=["']og:/i.test(rootHtml),
    markdownNegotiation: !!mdNeg && (mdNeg.headers['content-type'] || '').includes('text/markdown')
  };
}
