import {
  execFileSync,
  spawnSync,
} from 'node:child_process';

import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import {
  tmpdir,
} from 'node:os';

import {
  join,
  resolve,
} from 'node:path';

const projectRoot = process.cwd();

const temporaryDirectory =
  mkdtempSync(
    join(
      tmpdir(),
      'design-system-guard-consumer-'
    )
  );

let tarballPath;

function run(
  command,
  args,
  options = {}
) {
  execFileSync(
    command,
    args,
    {
      cwd: temporaryDirectory,
      stdio: 'inherit',
      ...options,
    }
  );
}

try {
  console.log(
    'Packing package...'
  );

  const tarballName =
    execFileSync(
      'npm',
      [
        'pack',
        '--silent',
      ],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      }
    )
      .trim()
      .split('\n')
      .at(-1);

  if (!tarballName) {
    throw new Error(
      'npm pack did not return a tarball name.'
    );
  }

  tarballPath = resolve(
    projectRoot,
    tarballName
  );

  writeFileSync(
    join(
      temporaryDirectory,
      'package.json'
    ),
    JSON.stringify(
      {
        private: true,
        type: 'module',
      },
      null,
      2
    )
  );

  console.log(
    'Installing packed tarball...'
  );

  run(
    'npm',
    [
      'install',
      '--silent',
      tarballPath,
    ]
  );

  writeFileSync(
    join(
      temporaryDirectory,
      'esm.mjs'
    ),
    `
import {
  analyzeSource,
  defineConfig,
  validateConfig,
} from 'design-system-guard';

const config = defineConfig({
  tokens: ['--color-primary'],
});

validateConfig(config);

const result = analyzeSource({
  filePath: 'demo.tsx',
  source: '<div />',
  config,
});

if (!Array.isArray(result)) {
  throw new Error('ESM API failed.');
}
`
  );

  writeFileSync(
    join(
      temporaryDirectory,
      'eslint.mjs'
    ),
    `
import {
  createEslintConfig,
  createEslintPlugin,
} from 'design-system-guard/eslint';

const plugin = createEslintPlugin({
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },
  },
});

const config = createEslintConfig({
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },
  },
});

if (!plugin.rules['prefer-design-system-components']) {
  throw new Error('ESLint plugin export failed.');
}

if (!config.plugins['design-system-guard']) {
  throw new Error('ESLint flat config export failed.');
}
`
  );

  writeFileSync(
    join(
      temporaryDirectory,
      'cjs.cjs'
    ),
    `
const {
  analyzeSource,
} = require('design-system-guard');

const result = analyzeSource({
  filePath: 'demo.tsx',
  source: '<div />',
});

if (!Array.isArray(result)) {
  throw new Error('CommonJS API failed.');
}
`
  );

  console.log(
    'Verifying ESLint is not auto-installed for core consumers...'
  );

  const eslintLookup =
    spawnSync(
      'npm',
      [
        'ls',
        'eslint',
        '--depth=0',
      ],
      {
        cwd:
          temporaryDirectory,

        encoding:
          'utf8',
      }
    );

  if (eslintLookup.status === 0) {
    throw new Error(
      'ESLint was automatically installed even though it is an optional peer.'
    );
  }

  console.log(
    'ESLint optional-peer check passed.'
  );

  console.log(
    'Testing ESM consumer...'
  );

  run(
    process.execPath,
    [
      'esm.mjs',
    ]
  );

  console.log(
    'Testing ESLint subpath consumer...'
  );

  run(
    process.execPath,
    [
      'eslint.mjs',
    ]
  );

  console.log(
    'Testing CommonJS consumer...'
  );

  run(
    process.execPath,
    [
      'cjs.cjs',
    ]
  );

  console.log(
    'Testing CLI consumer...'
  );

  run(
    join(
      temporaryDirectory,
      'node_modules',
      '.bin',
      'design-system-guard'
    ),
    [
      '--help',
    ]
  );

  console.log(
    'Testing legacy ui-guard CLI alias...'
  );

  run(
    join(
      temporaryDirectory,
      'node_modules',
      '.bin',
      'ui-guard'
    ),
    [
      '--help',
    ]
  );

  console.log(
    'Packed package consumer tests passed.'
  );
} finally {
  rmSync(
    temporaryDirectory,
    {
      recursive: true,
      force: true,
    }
  );

  if (tarballPath) {
    rmSync(
      tarballPath,
      {
        force: true,
      }
    );
  }
}
