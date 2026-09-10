import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeSource,
} from '../dist/index.mjs';

const config = {
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },
    input: {
      name: 'Input',
      from: '@acme/ui',
    },
  },

  tokens: [
    '--color-primary',
    '--color-surface',
  ],

  rules: {
    'no-hardcoded-colors': 'error',
    'prefer-design-system-components': 'error',
    'no-unknown-tokens': 'error',
  },
};

test(
  'reports raw design-system elements, hardcoded colors, and unknown tokens',
  () => {
    const diagnostics = analyzeSource({
      filePath: 'Checkout.tsx',
      config,
      source: `
        export function Checkout() {
          return (
            <button
              style={{
                color: '#fff',
                background: 'var(--color-brand)'
              }}
            >
              Buy
            </button>
          );
        }
      `,
    });

    assert.deepEqual(
      diagnostics
        .map(diagnostic => diagnostic.ruleId)
        .sort(),
      [
        'no-hardcoded-colors',
        'no-unknown-tokens',
        'prefer-design-system-components',
      ].sort()
    );
  }
);

test(
  'accepts configured components and tokens',
  () => {
    const diagnostics = analyzeSource({
      filePath: 'Checkout.tsx',
      config,
      source: `
        import { Button } from '@acme/ui';

        export function Checkout() {
          return (
            <Button
              style={{
                color: 'var(--color-primary)'
              }}
            >
              Buy
            </Button>
          );
        }
      `,
    });

    assert.equal(
      diagnostics.length,
      0
    );
  }
);

test(
  'supports disabling individual rules',
  () => {
    const diagnostics = analyzeSource({
      filePath: 'Button.tsx',

      config: {
        ...config,

        rules: {
          ...config.rules,
          'no-hardcoded-colors': 'off',
        },
      },

      source: `
        export function Example() {
          return (
            <div style={{ color: '#fff' }} />
          );
        }
      `,
    });

    assert.equal(
      diagnostics.some(
        diagnostic =>
          diagnostic.ruleId
          === 'no-hardcoded-colors'
      ),
      false
    );
  }
);

test(
  'returns a parse diagnostic instead of throwing',
  () => {
    const diagnostics = analyzeSource({
      filePath: 'Broken.tsx',
      config,
      source: 'const =',
    });

    assert.equal(
      diagnostics.length,
      1
    );

    assert.equal(
      diagnostics[0]?.ruleId,
      'parse-error'
    );
  }
);
