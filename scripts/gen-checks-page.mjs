#!/usr/bin/env node
/** Generate site/checks.html from the single-source CHECK_META catalog. */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECK_META } from '../dist/checks-catalog.js';

const here = dirname(fileURLToPath(import.meta.url));
const CATS = { security: ['Security', '#f43f5e'], 'agent-ready': ['Agent-readiness', '#10b981'], quality: ['Protocol quality', '#3bd1ff'] };
const esc = (t) => String(t).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

const entries = Object.entries(CHECK_META);
let sections = '';
for (const [catKey, [catLabel, color]] of Object.entries(CATS)) {
  const rows = entries.filter(([, m]) => m.category === catKey).map(([id, m]) =>
    `<div class="chk"><div class="ct"><code>${esc(id)}</code><span class="cl">${esc(m.label)}</span></div><p>${esc(m.why)}</p></div>`).join('');
  sections += `<section><h2 style="color:${color}">${catLabel}</h2>${rows}</section>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Checks — mcp-scorecard</title>
<meta name="description" content="Every check mcp-scorecard runs (${entries.length} total) — what it is, why it matters for agents, grouped by security, agent-readiness and protocol quality.">
<link rel="canonical" href="https://mcp-scorecard.vercel.app/checks.html">
<style>
 body{margin:0;background:#0b1120;color:#e8eefc;font-family:'Space Grotesk',system-ui,sans-serif;line-height:1.55}
 .wrap{max-width:820px;margin:0 auto;padding:50px 22px 70px}
 a{color:#10b981} h1{font-size:38px;margin:0 0 6px} .sub{color:#7c8aa6;margin:0 0 30px}
 h2{font-size:20px;margin:34px 0 12px;border-bottom:1px solid rgba(120,160,255,.12);padding-bottom:6px}
 .chk{padding:12px 0;border-bottom:1px solid rgba(120,160,255,.06)}
 .ct{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap} code{font-family:'JetBrains Mono',monospace;color:#8fa;font-size:13px}
 .cl{font-weight:600} .chk p{margin:5px 0 0;color:#9aa6c2;font-size:14px}
 footer{margin-top:40px;color:#7c8aa6;font-size:13px}
</style></head>
<body><main class="wrap">
<p><a href="/">← mcp-scorecard</a></p>
<h1>The checks</h1>
<p class="sub">${entries.length} checks across security, agent-readiness, and protocol quality. Run any subset with <code>--profile</code>.</p>
${sections}
<footer>Audit your own: <code>npx -y mcp-scorecard &lt;target&gt;</code> · <a href="https://github.com/davidmosiah/mcp-scorecard">GitHub</a> · <a href="/llms.txt">llms.txt</a></footer>
</main></body></html>`;

writeFileSync(resolve(here, '..', 'site', 'checks.html'), html);
console.log(`gen-checks-page: wrote site/checks.html (${entries.length} checks)`);
