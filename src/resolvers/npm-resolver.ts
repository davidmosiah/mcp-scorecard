/**
 * npm resolver — given a package name (optionally @version), runs `npm pack`
 * into a fresh temp dir, unpacks the tarball, locates the bin from
 * package.json, and returns a ResolvedTarget ready for probing.
 *
 * Security:
 *   - works in /tmp/scorecard-work/probe-<random>/, never in the user's HOME.
 *   - uses --no-fund --no-audit to keep output clean and avoid any phone-home.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as pathResolve } from 'node:path';
import type { ResolvedTarget } from '../types.js';

const SCRATCH_ROOT = '/tmp/scorecard-work';

function ensureScratchRoot(): string {
  if (!existsSync(SCRATCH_ROOT)) {
    try {
      mkdirSync(SCRATCH_ROOT, { recursive: true });
      return SCRATCH_ROOT;
    } catch {
      // fall back to OS tmpdir if /tmp/scorecard-work is unwritable
    }
  }
  if (existsSync(SCRATCH_ROOT)) return SCRATCH_ROOT;
  return tmpdir();
}

function pickBin(pkg: Record<string, unknown>): string | undefined {
  const bin = pkg.bin;
  if (typeof bin === 'string') return bin;
  if (bin && typeof bin === 'object') {
    const entries = Object.values(bin as Record<string, string>);
    return entries[0];
  }
  // some MCPs export `main` and rely on `node dist/index.js`
  if (typeof pkg.main === 'string') return pkg.main as string;
  return undefined;
}

export async function resolveNpmPackage(spec: string): Promise<ResolvedTarget> {
  const scratch = ensureScratchRoot();
  const dest = mkdtempSync(join(scratch, 'probe-'));

  const pack = spawnSync('npm', ['pack', spec, '--pack-destination', dest, '--no-fund', '--no-audit'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (pack.status !== 0) {
    throw new Error(`npm pack failed for ${spec}: ${pack.stderr || pack.stdout}`);
  }

  const tarball = readdirSync(dest).find((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error(`npm pack produced no .tgz under ${dest}`);

  const tarPath = join(dest, tarball);
  const extractDir = join(dest, 'pkg');
  mkdirSync(extractDir, { recursive: true });
  const tar = spawnSync('tar', ['xzf', tarPath, '-C', extractDir, '--strip-components=1'], {
    encoding: 'utf8'
  });
  if (tar.status !== 0) {
    throw new Error(`tar extract failed for ${tarPath}: ${tar.stderr}`);
  }

  const pkgJsonPath = join(extractDir, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`Extracted package has no package.json at ${pkgJsonPath}`);
  }
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  // Install production deps inside the extracted tarball so the launched
  // binary can `import` its declared dependencies. We skip devDeps,
  // scripts, fund/audit chatter, and any postinstall side-effects.
  const hasDeps = pkg.dependencies && Object.keys(pkg.dependencies).length > 0;
  if (hasDeps) {
    const inst = spawnSync(
      'npm',
      ['install', '--omit=dev', '--no-fund', '--no-audit', '--ignore-scripts', '--no-package-lock'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: extractDir }
    );
    if (inst.status !== 0) {
      throw new Error(
        `npm install (prod deps) failed in ${extractDir}: ${inst.stderr || inst.stdout}`
      );
    }
  }

  const binRel = pickBin(pkg);
  if (!binRel) {
    throw new Error(`Package ${pkg.name} has no bin or main — cannot launch.`);
  }
  const binAbs = pathResolve(extractDir, binRel);
  if (!existsSync(binAbs)) {
    throw new Error(`Resolved bin does not exist after extract: ${binAbs}`);
  }
  // Ensure it's a file, not a dir.
  if (!statSync(binAbs).isFile()) {
    throw new Error(`Resolved bin is not a file: ${binAbs}`);
  }

  return {
    displayName: pkg.name as string,
    version: pkg.version as string | undefined,
    command: 'node',
    args: [binAbs],
    packageDir: extractDir,
    packageJson: pkg
  };
}
