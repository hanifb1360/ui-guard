import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeSource,
  diagnosticsToSarif,
} from '../dist/index.mjs';

test(
  'converts diagnostics to SARIF 2.1.0',
  () => {
    const diagnostics =
      analyzeSource({
        filePath:
          '/project/src/Checkout.tsx',

        config: {
          components: {
            button: {
              name: 'Button',
              from: '@acme/ui',
            },
          },

          tokens: [
            '--color-primary',
          ],
        },

        source: `
          export function Checkout() {
            return (
              <button
                style={{
                  color: '#ffffff',
                  background: 'var(--color-brand)'
                }}
              >
                Buy
              </button>
            );
          }
        `,
      });

    const sarif =
      diagnosticsToSarif(
        diagnostics,
        {
          cwd: '/project',
          toolVersion: '0.1.0',
        }
      );

    assert.equal(
      sarif.version,
      '2.1.0'
    );

    assert.equal(
      sarif.runs.length,
      1
    );

    const run =
      sarif.runs[0];

    assert.equal(
      run?.tool.driver.name,
      'ui-guard'
    );

    assert.equal(
      run?.tool.driver.semanticVersion,
      '0.1.0'
    );

    assert.equal(
      run?.results.length,
      3
    );

    for (
      const result
      of run?.results ?? []
    ) {
      assert.equal(
        result.locations[0]
          ?.physicalLocation
          .artifactLocation
          .uri,
        'src/Checkout.tsx'
      );

      assert.ok(
        result.locations[0]
          ?.physicalLocation
          .region
          .startLine
      );

      assert.ok(
        result.ruleId
      );
    }
  }
);

test(
  'preserves warning severity in SARIF output',
  () => {
    const diagnostics =
      analyzeSource({
        filePath:
          '/project/src/Button.tsx',

        config: {
          components: {
            button: {
              name: 'Button',
              from: '@acme/ui',
            },
          },

          rules: {
            'prefer-design-system-components':
              'warn',

            'no-hardcoded-colors':
              'off',

            'no-unknown-tokens':
              'off',
          },
        },

        source:
          'export const Example = () => <button>Save</button>;',
      });

    const sarif =
      diagnosticsToSarif(
        diagnostics,
        {
          cwd: '/project',
        }
      );

    assert.equal(
      sarif.runs[0]
        ?.results[0]
        ?.level,
      'warning'
    );
  }
);
