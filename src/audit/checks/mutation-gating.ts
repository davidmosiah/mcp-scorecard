/**
 * Check 4 — Mutation gating.
 *
 * A tool is treated as mutating if its name matches MUTATION_PATTERNS (set,
 * update, delete, create, pause, resume, enable, disable, cancel, publish,
 * send, etc.). For each mutation tool, we check if the description mentions
 * any MUTATION_GATE_HINTS phrase.
 *
 * Scoring:
 *   - if NO mutation tools exist → 10 (vacuously gated)
 *   - else: 10 * (gated / total_mutations)
 */

import { MUTATION_GATE_HINTS, MUTATION_PATTERNS } from '../../constants.js';
import type { CheckResult, ProbeSnapshot } from '../../types.js';

function isMutation(name: string): boolean {
  return MUTATION_PATTERNS.some((p) => p.test(name));
}

function descriptionMentionsGate(desc: string | undefined): boolean {
  if (!desc) return false;
  const lower = desc.toLowerCase();
  return MUTATION_GATE_HINTS.some((hint) => lower.includes(hint));
}

export function checkMutationGating(snapshot: ProbeSnapshot): CheckResult {
  const mutations = snapshot.tools.filter((t) => isMutation(t.name));

  if (mutations.length === 0) {
    return {
      id: 'mutation_gating',
      label: 'Mutation gating',
      score: 10,
      status: 'pass',
      summary: 'no write tools — n/a',
      details: [],
      fixes: []
    };
  }

  const gated = mutations.filter((t) => descriptionMentionsGate(t.description));
  const ungated = mutations.filter((t) => !descriptionMentionsGate(t.description));
  const score = Math.round((gated.length / mutations.length) * 10);
  const status = score >= 9 ? 'pass' : score >= 5 ? 'warn' : 'fail';

  const details: string[] = [];
  if (ungated.length) {
    details.push(`Ungated mutations: ${ungated.slice(0, 10).map((t) => t.name).join(', ')}`);
  }

  const fixes: string[] = [];
  if (ungated.length) {
    fixes.push(
      'Document the gating mechanism in each mutation tool description (e.g. "Gated by ALLOW_MUTATIONS=1" or "Requires explicit user intent").'
    );
  }

  return {
    id: 'mutation_gating',
    label: 'Mutation gating',
    score,
    status,
    summary: `${gated.length}/${mutations.length} mutation tools document gating`,
    details,
    fixes
  };
}
