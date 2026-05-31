/**
 * Scoring profiles — narrow a report to the checks in a category (security /
 * quality / agent-ready) and rescore over just those. Pure; returns a new report.
 */
import { CHECK_META, PROFILES } from './checks-catalog.js';
import type { AuditReport } from './types.js';
import { toGrade } from './types.js';

export function isProfile(name: string): boolean {
  return name in PROFILES;
}

export function applyProfile(report: AuditReport, profileName: string): AuditReport {
  const profile = PROFILES[profileName];
  if (!profile || profileName === 'all') return report;
  const cats = profile.categories;
  const filtered = report.checks.filter((c) => {
    const meta = CHECK_META[c.id];
    return meta && cats.includes(meta.category);
  });
  if (filtered.length === 0) return report; // nothing in this profile for this mode
  const sum = filtered.reduce((acc, c) => acc + Math.max(0, Math.min(10, c.score)), 0);
  const totalScore = Math.round((sum / (filtered.length * 10)) * 100);
  return { ...report, checks: filtered, totalScore, grade: toGrade(totalScore) };
}
