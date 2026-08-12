import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scratchRoot = '/tmp/scorecard-work';
const fixtureRoot = mkdtempSync(join(tmpdir(), 'mcp-scorecard-cleanup-test-'));
const fixtureDir = join(fixtureRoot, 'fixture');
const invalidFixtureDir = join(fixtureRoot, 'invalid-fixture');
const fakeBinDir = join(fixtureRoot, 'bin');
mkdirSync(fixtureDir);
mkdirSync(invalidFixtureDir);
mkdirSync(fakeBinDir);
writeFileSync(
  join(fixtureDir, 'package.json'),
  JSON.stringify({
    name: 'mcp-scorecard-scratch-fixture',
    version: '1.0.0',
    type: 'module',
    bin: 'index.js'
  })
);
writeFileSync(join(fixtureDir, 'index.js'), '#!/usr/bin/env node\nprocess.exit(0);\n');
writeFileSync(
  join(invalidFixtureDir, 'package.json'),
  JSON.stringify({ name: 'mcp-scorecard-invalid-scratch-fixture', version: '1.0.0' })
);
writeFileSync(
  join(fakeBinDir, 'gh'),
  `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const cloneDir = process.argv[5];
mkdirSync(join(cloneDir, 'dist'), { recursive: true });
writeFileSync(join(cloneDir, 'package.json'), JSON.stringify({ version: '1.0.0' }));
writeFileSync(join(cloneDir, 'dist/index.js'), 'process.exit(0);\\n');
`
);
spawnSync('chmod', ['+x', join(fakeBinDir, 'gh')]);

function assertRunLeavesNoScratch(spec, env = process.env) {
  const before = new Set(existsSync(scratchRoot) ? readdirSync(scratchRoot) : []);
  let created = [];
  const result = spawnSync(
    process.execPath,
    ['dist/index.js', spec, '--json'],
    { encoding: 'utf8', timeout: 45_000, env }
  );
  assert.equal(result.error?.code, undefined, result.error?.message);

  try {
    const after = existsSync(scratchRoot) ? readdirSync(scratchRoot) : [];
    created = after.filter((entry) => !before.has(entry));
    assert.deepEqual(
      created,
      [],
      `CLI leaked scratch directories for ${spec}: ${created.join(', ')}`
    );
  } finally {
    for (const entry of created) {
      rmSync(join(scratchRoot, entry), { recursive: true, force: true });
    }
  }
}

try {
  assertRunLeavesNoScratch(`file:${fixtureDir}`);
  assertRunLeavesNoScratch(`file:${invalidFixtureDir}`);
  assertRunLeavesNoScratch('github:test/fixture', {
    ...process.env,
    PATH: `${fakeBinDir}:${process.env.PATH}`
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('scratch cleanup: ok');
