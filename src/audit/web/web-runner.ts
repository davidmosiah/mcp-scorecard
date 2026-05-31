/**
 * Web runner — orchestrates the hosted/remote audit: fetch a WebProbe, run the
 * pure web checks, aggregate into the same AuditReport shape as the stdio path.
 */
import { SERVER_VERSION } from '../../constants.js';
import type { AuditReport } from '../../types.js';
import { toGrade } from '../../types.js';
import { aggregateScore } from '../scorer.js';
import { fetchWebProbe } from './web-probe.js';
import { scoreWeb } from './web-checks.js';

export async function runWebAudit(url: string): Promise<AuditReport> {
  const probe = await fetchWebProbe(url);
  const checks = scoreWeb(probe);
  const totalScore = aggregateScore(checks);
  return {
    target: { displayName: probe.url, serverName: probe.url },
    totalScore,
    grade: toGrade(totalScore),
    mode: 'web',
    checks,
    generatedAt: new Date().toISOString(),
    scorecardVersion: SERVER_VERSION
  };
}
