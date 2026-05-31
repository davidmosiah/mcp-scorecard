#!/usr/bin/env node
/**
 * Web-mode tests — pure scorer (scoreWeb) over fixture WebProbes. No network:
 * a "perfect" probe must score high, an "empty" one must score near zero, and
 * every check id must be a web_* id. Deterministic, offline.
 */
import assert from 'node:assert/strict';
import { scoreWeb } from '../dist/audit/web/web-checks.js';

const perfect = {
  url: 'https://x', https: true, rootStatus: 200,
  headers: {
    'strict-transport-security': 'max-age=63072000',
    'content-security-policy': "default-src 'self'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY'
  },
  llmsTxt: true, serverCard: true, serverCardValid: true, agentSkills: true, apiCatalog: true,
  robotsTxt: true, aiBotRules: true, contentSignal: true, sitemap: true,
  oauthProtectedResource: false, oauthAuthServer: false, authMd: true,
  jsonLd: true, ogTags: true, markdownNegotiation: true
};

const empty = {
  url: 'http://x', https: false, rootStatus: 0, headers: {},
  llmsTxt: false, serverCard: false, serverCardValid: false, agentSkills: false, apiCatalog: false,
  robotsTxt: false, aiBotRules: false, contentSignal: false, sitemap: false,
  oauthProtectedResource: false, oauthAuthServer: false, authMd: false,
  jsonLd: false, ogTags: false, markdownNegotiation: false
};

const pc = scoreWeb(perfect);
assert.equal(pc.length, 10, 'web audit returns 10 checks');
assert.ok(pc.every((c) => c.id.startsWith('web_')), 'all ids are web_*');
assert.ok(pc.every((c) => c.score >= 0 && c.score <= 10), 'scores within 0..10');
const psum = pc.reduce((a, c) => a + c.score, 0);
assert.ok(psum >= 95, `perfect probe scores high (got ${psum})`);
assert.equal(pc.find((c) => c.id === 'web_https').score, 10, 'https present = 10');

const ec = scoreWeb(empty);
const esum = ec.reduce((a, c) => a + c.score, 0);
assert.ok(esum <= 15, `empty probe scores low (got ${esum})`);
assert.equal(ec.find((c) => c.id === 'web_https').score, 0, 'no https = 0');
assert.equal(ec.find((c) => c.id === 'web_llms_txt').score, 0, 'no llms.txt = 0');

console.log(`web checks OK: perfect=${psum}/100, empty=${esum}/100, ids=${pc.length}`);
