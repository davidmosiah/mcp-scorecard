/**
 * GitHub resolver — extracts owner/repo from a URL, clones via `gh repo
 * clone` into /tmp/scorecard-work/, reads package.json for the npm name,
 * then delegates to npm resolver (so we audit what users actually `npx`).
 *
 * Falls back to launching from a local `dist/index.js` if the package was
 * never published.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';
import type { ResolvedTarget } from '../types.js';
import { resolveNpmPackage } from './npm-resolver.js';

const SCRATCH_ROOT = '/tmp/scorecard-work';

function parseOwnerRepo(input: string): { owner: string; repo: string } | undefined {
  const m =
    input.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i) ||
    input.match(/^github:([^/]+)\/(.+)$/i);
  if (!m) return undefined;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

export async function resolveGithubRepo(url: string): Promise<ResolvedTarget> {
  const parsed = parseOwnerRepo(url);
  if (!parsed) throw new Error(`Not a recognizable GitHub URL: ${url}`);

  if (!existsSync(SCRATCH_ROOT)) mkdirSync(SCRATCH_ROOT, { recursive: true });
  const dest = mkdtempSync(join(SCRATCH_ROOT, 'gh-'));
  const cloneDir = join(dest, parsed.repo);

  const gh = spawnSync('gh', ['repo', 'clone', `${parsed.owner}/${parsed.repo}`, cloneDir, '--', '--depth=1'], {
    encoding: 'utf8'
  });
  if (gh.status !== 0) {
    throw new Error(`gh repo clone failed for ${parsed.owner}/${parsed.repo}: ${gh.stderr}`);
  }

  const pkgJsonPath = join(cloneDir, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`Cloned repo has no package.json: ${pkgJsonPath}`);
  }
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  // Prefer auditing the published npm package — that's what agents actually
  // pull via `npx -y <name>`. Falls back to local dist if npm pack fails.
  if (typeof pkg.name === 'string') {
    try {
      return await resolveNpmPackage(pkg.name as string);
    } catch {
      // package not published — try local dist
    }
  }

  const localBin = pathResolve(cloneDir, (pkg.bin && typeof pkg.bin === 'object'
    ? (Object.values(pkg.bin as Record<string, string>)[0] ?? 'dist/index.js')
    : (typeof pkg.bin === 'string' ? pkg.bin : 'dist/index.js')));

  if (!existsSync(localBin)) {
    throw new Error(`No published npm package and no local bin at ${localBin}. Run \`npm run build\` in the repo first.`);
  }

  return {
    displayName: (pkg.name as string) ?? `${parsed.owner}/${parsed.repo}`,
    version: pkg.version as string | undefined,
    command: 'node',
    args: [localBin],
    packageDir: cloneDir,
    packageJson: pkg
  };
}
