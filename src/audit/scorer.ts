/**
 * Scorer — sums the 10 check scores (each 0..10) into a single 0..100.
 *
 * Currently every check has equal weight. Future versions may introduce
 * weighting (CLI: --weights schema=2,naming=1,...). For now: trivially sum.
 */

import type { CheckResult } from '../types.js';

const EXPECTED_CHECK_COUNT = 10;

export function aggregateScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  // Use the expected denominator (10 checks * 10 each = 100); if a check
  // failed to even run, we still divide by 10 so the score reflects gaps.
  const sum = checks.reduce((acc, c) => acc + Math.max(0, Math.min(10, c.score)), 0);
  const denom = checks.length * 10; // supports stdio (10) + web (12) modes
  return Math.round((sum / denom) * 100);
}
