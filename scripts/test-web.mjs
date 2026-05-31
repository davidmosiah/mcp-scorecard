#!/usr/bin/env node
/**
 * Web-mode tests — pure scorer (scoreWeb) over fixture WebProbes. No network.
 * 12 checks (10 agent-readiness/security + exposed-paths + CORS posture).
 * perfect → high, empty → low, insecure → exposed/CORS checks fire. Deterministic.
 */
import assert from 'node:assert/strict';
import { scoreWeb } from '../dist/audit/web/web-checks.js';

const base = {
  url: 'https://x', https: true, rootStatus: 200,
  headers: {
    'strict-transport-security': 'max-age=63072000', 'content-security-policy': "default-src 'self'",
    'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY'
  },
  llmsTxt: true, serverCard: true, serverCardValid: true, agentSkills: true, apiCatalog: true,
  robotsTxt: true, aiBotRules: true, contentSignal: true, sitemap: true,
  oauthProtectedResource: false, oauthAuthServer: false, authMd: true,
  jsonLd: true, ogTags: true, markdownNegotiation: true,
  gitExposed: false, envExposed: false, securityTxt: true, corsAllowOrigin: null, corsAllowCredentials: false
};

const empty = {
  url: 'http://x', https: false, rootStatus: 0, headers: {},
  llmsTxt: false, serverCard: false, serverCardValid: false, agentSkills: false, apiCatalog: false,
  robotsTxt: false, aiBotRules: false, contentSignal: false, sitemap: false,
  oauthProtectedResource: false, oauthAuthServer: false, authMd: false,
  jsonLd: false, ogTags: false, markdownNegotiation: false,
  gitExposed: false, envExposed: false, securityTxt: false, corsAllowOrigin: null, corsAllowCredentials: false
};

const insecure = { ...base, gitExposed: true, corsAllowOrigin: '*', corsAllowCredentials: true };

const N = 12;
const pc = scoreWeb(base);
assert.equal(pc.length, N, `web audit returns ${N} checks`);
assert.ok(pc.every((c) => c.id.startsWith('web_')), 'all ids are web_*');
assert.ok(pc.every((c) => c.score >= 0 && c.score <= 10), 'scores within 0..10');
const psum = pc.reduce((a, c) => a + c.score, 0);
assert.ok(psum >= N * 10 - 6, `perfect probe scores high (got ${psum}/${N * 10})`);
assert.equal(pc.find((c) => c.id === 'web_https').score, 10, 'https = 10');
assert.equal(pc.find((c) => c.id === 'web_exposed_paths').score, 10, 'nothing exposed = 10');

const ec = scoreWeb(empty);
const esum = ec.reduce((a, c) => a + c.score, 0);
assert.ok(esum <= 30, `empty probe scores low (got ${esum})`);
assert.equal(ec.find((c) => c.id === 'web_https').score, 0, 'no https = 0');

const ic = scoreWeb(insecure);
assert.equal(ic.find((c) => c.id === 'web_exposed_paths').score, 0, 'exposed /.git = 0 (critical)');
assert.equal(ic.find((c) => c.id === 'web_cors_posture').score, 2, 'wildcard+credentials CORS = 2 (dangerous)');

console.log(`web checks OK: perfect=${psum}/${N * 10}, empty=${esum}/${N * 10}, insecure flags fire, ids=${N}`);
