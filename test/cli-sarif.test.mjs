import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mkdirSync,
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
  spawnSync,
} from 'node:child_process';

test(
  'CLI writes SARIF even when violations make the command fail',
  () => {
    const temporaryDirectory =
      mkdtempSync(
        join(
          tmpdir(),
          'design-system-guard-sarif-'
        )
      );

    try {
      const sourceDirectory =
        join(
          temporaryDirectory,
          'src'
        );

      mkdirSync(
        sourceDirectory
      );

      writeFileSync(
        join(
          sourceDirectory,
          'Button.tsx'
        ),
        `
          export function ButtonExample() {
            return (
              <button
                style={{
                  color: '#fff'
                }}
              >
                Save
              </button>
            );
          }
        `
      );

      writeFileSync(
        join(
          temporaryDirectory,
          'design-system-guard.config.mjs'
        ),
        `
          export default {
            components: {
              button: {
                name: 'Button',
                from: '@acme/ui'
              }
            }
          };
        `
      );

      const cliPath =
        resolve(
          process.cwd(),
          'dist/cli.mjs'
        );

      const result =
        spawnSync(
          process.execPath,
          [
            cliPath,
            'check',
            'src',
            '--config',
            'design-system-guard.config.mjs',
            '--sarif',
            'results/design-system-guard.sarif',
          ],
          {
            cwd:
              temporaryDirectory,

            encoding:
              'utf8',
          }
        );

      assert.equal(
        result.status,
        1
      );

      const sarif =
        JSON.parse(
          readFileSync(
            join(
              temporaryDirectory,
              'results',
              'design-system-guard.sarif'
            ),
            'utf8'
          )
        );

      assert.equal(
        sarif.version,
        '2.1.0'
      );

      assert.equal(
        sarif.runs[0]
          .tool.driver.name,
        'design-system-guard'
      );

      assert.equal(
        sarif.runs[0]
          .results.length,
        2
      );
    } finally {
      rmSync(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);
