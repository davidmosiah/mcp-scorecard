/**
 * Runner — orchestrates probe + 10 checks → AuditReport.
 *
 * Order matters only for the displayed list; checks are independent and
 * read from the same probe snapshot. If a check throws, we record a 0
 * with a synthetic detail entry rather than crashing the audit.
 */

import { SERVER_VERSION } from '../constants.js';
import type { AuditReport, CheckResult, ResolvedTarget } from '../types.js';
import { checkAgentManifest } from './checks/agent-manifest.js';
import { checkAnnotations } from './checks/annotations.js';
import { checkManifestDiscoverability } from './checks/manifest-discoverability.js';
import { checkMutationGating } from './checks/mutation-gating.js';
import { checkPrivacyModes } from './checks/privacy-modes.js';
import { checkResources } from './checks/resources.js';
import { checkSchemaValidity } from './checks/schema-validity.js';
import { checkSmokeTest } from './checks/smoke-test.js';
import { checkToolDescriptions } from './checks/tool-descriptions.js';
import { checkToolNaming } from './checks/tool-naming.js';
import { probeTarget } from './probe.js';
import { aggregateScore } from './scorer.js';

type CheckId = CheckResult['id'];

const CHECK_LABELS: Partial<Record<CheckId, string>> = {
  schema_validity: 'Schema validity',
  tool_naming: 'Tool naming convention',
  privacy_modes: 'Privacy modes documented',
  mutation_gating: 'Mutation gating',
  agent_manifest: 'Agent manifest',
  smoke_test: 'Smoke test',
  resources: 'Resources advertised',
  tool_descriptions: 'Tool descriptions',
  annotations: 'Annotations',
  manifest_discoverability: 'Manifest discoverability'
};

function safeRun(id: CheckId, fn: () => CheckResult): CheckResult {
  try {
    return fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id,
      label: CHECK_LABELS[id] ?? id,
      score: 0,
      status: 'fail',
      summary: 'check threw an error',
      details: [msg.slice(0, 200)],
      fixes: []
    };
  }
}

export async function runAudit(target: ResolvedTarget): Promise<AuditReport> {
  const snapshot = await probeTarget(target);

  const checks: CheckResult[] = [
    safeRun('schema_validity', () => checkSchemaValidity(snapshot)),
    safeRun('tool_naming', () => checkToolNaming(snapshot)),
    safeRun('privacy_modes', () => checkPrivacyModes(snapshot)),
    safeRun('mutation_gating', () => checkMutationGating(snapshot)),
    safeRun('agent_manifest', () => checkAgentManifest(snapshot)),
    safeRun('smoke_test', () => checkSmokeTest(snapshot, target)),
    safeRun('resources', () => checkResources(snapshot)),
    safeRun('tool_descriptions', () => checkToolDescriptions(snapshot)),
    safeRun('annotations', () => checkAnnotations(snapshot)),
    safeRun('manifest_discoverability', () => checkManifestDiscoverability(snapshot))
  ];

  return {
    target: {
      displayName: target.displayName,
      version: target.version,
      serverName: snapshot.serverInfo.name,
      serverVersion: snapshot.serverInfo.version
    },
    totalScore: aggregateScore(checks),
    checks,
    generatedAt: new Date().toISOString(),
    scorecardVersion: SERVER_VERSION
  };
}
