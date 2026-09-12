import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mkdtempSync,
  readFileSync,
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

import {
  pathToFileURL,
} from 'node:url';

import {
  spawnSync,
} from 'node:child_process';

import {
  validateConfig,
} from '../dist/index.mjs';

const cliPath =
  resolve(
    process.cwd(),
    'dist/cli.mjs'
  );

test(
  'CLI rejects an invalid configuration with a precise path',
  () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'design-system-guard-invalid-config-'
        )
      );

    try {
      writeFileSync(
        join(
          directory,
          'design-system-guard.config.mjs'
        ),

        `
          export default {
            rules: {
              'component-prop-policy':
                'fatal'
            }
          };
        `
      );

      const result =
        spawnSync(
          process.execPath,
          [
            cliPath,
            'check',
            'src',
          ],
          {
            cwd:
              directory,

            encoding:
              'utf8',
          }
        );

      assert.equal(
        result.status,
        1
      );

      assert.match(
        result.stderr,
        /rules\.component-prop-policy/
      );

      assert.match(
        result.stderr,
        /expected "off", "warn", or "error"/
      );

      assert.match(
        result.stderr,
        /design-system-guard\.config\.mjs/
      );
    } finally {
      rmSync(
        directory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);

test(
  'design-system-guard init creates a modern valid configuration',
  async () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'design-system-guard-init-'
        )
      );

    try {
      const result =
        spawnSync(
          process.execPath,
          [
            cliPath,
            'init',
          ],
          {
            cwd:
              directory,

            encoding:
              'utf8',
          }
        );

      assert.equal(
        result.status,
        0
      );

      assert.match(
        result.stdout,
        /Created design-system-guard\.config\.mjs/
      );

      const configPath =
        join(
          directory,
          'design-system-guard.config.mjs'
        );

      const contents =
        readFileSync(
          configPath,
          'utf8'
        );

      assert.match(
        contents,
        /component-prop-policy/
      );

      assert.match(
        contents,
        /variant/
      );

      const imported =
        await import(
          pathToFileURL(
            configPath
          ).href
        );

      const config =
        imported.default;

      validateConfig(
        config
      );

      assert.deepEqual(
        config.components
          .button
          .props
          .variant
          .allowed,

        [
          'primary',
          'secondary',
          'danger',
        ]
      );
    } finally {
      rmSync(
        directory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);

test(
  'legacy ui-guard config filename remains supported',
  () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'design-system-guard-legacy-config-'
        )
      );

    try {
      writeFileSync(
        join(
          directory,
          'ui-guard.config.mjs'
        ),

        `
          export default {
            rules: {
              'no-hardcoded-colors':
                'fatal'
            }
          };
        `
      );

      writeFileSync(
        join(
          directory,
          'Example.jsx'
        ),

        `
          export function Example() {
            return <div />;
          }
        `
      );

      const result =
        spawnSync(
          process.execPath,
          [
            cliPath,
            'check',
            'Example.jsx',
          ],
          {
            cwd:
              directory,

            encoding:
              'utf8',
          }
        );

      assert.equal(
        result.status,
        1
      );

      assert.match(
        result.stderr,
        /expected "off", "warn", or "error"/
      );

      assert.match(
        result.stderr,
        /ui-guard\.config\.mjs/
      );
    } finally {
      rmSync(
        directory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);
