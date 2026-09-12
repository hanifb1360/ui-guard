import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Linter,
} from 'eslint';

import {
  createEslintConfig,
  createEslintPlugin,
} from '../dist/eslint.mjs';

const policy = {
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },
  },

  tokens: [
    '--color-primary',
  ],

  rules: {
    'component-prop-policy':
      'error',

    'prefer-design-system-components':
      'error',

    'no-hardcoded-colors':
      'error',

    'no-unknown-tokens':
      'error',
  },
};

function lint(
  source,
  config = policy
) {
  const linter =
    new Linter();

  const uiGuard =
    createEslintConfig(
      config
    );

  return linter.verify(
    source,
    [
      {
        files: [
          '**/*.jsx',
        ],

        ...uiGuard,

        languageOptions: {
          ecmaVersion:
            'latest',

          sourceType:
            'module',

          parserOptions: {
            ecmaFeatures: {
              jsx: true,
            },
          },
        },
      },
    ],
    {
      filename:
        'Checkout.jsx',
    }
  );
}

test(
  'ESLint adapter reports the same design-system-guard policy violations',
  () => {
    const messages =
      lint(`
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
      `);

    assert.deepEqual(
      messages
        .map(
          message =>
            message.ruleId
        )
        .sort(),

      [
        'design-system-guard/no-hardcoded-colors',
        'design-system-guard/no-unknown-tokens',
        'design-system-guard/prefer-design-system-components',
      ].sort()
    );

    assert.equal(
      messages.every(
        message =>
          message.severity
          === 2
      ),
      true
    );
  }
);

test(
  'ESLint severity follows the design-system-guard policy',
  () => {
    const messages =
      lint(
        `
          export function Example() {
            return (
              <button>
                Save
              </button>
            );
          }
        `,

        {
          components:
            policy.components,

          rules: {
            'prefer-design-system-components':
              'warn',

            'no-hardcoded-colors':
              'off',

            'no-unknown-tokens':
              'off',
          },
        }
      );

    assert.equal(
      messages.length,
      1
    );

    assert.equal(
      messages[0]?.ruleId,
      'design-system-guard/prefer-design-system-components'
    );

    assert.equal(
      messages[0]?.severity,
      1
    );
  }
);

test(
  'createEslintPlugin exposes all public rules',
  () => {
    const plugin =
      createEslintPlugin(
        policy
      );

    assert.deepEqual(
      Object.keys(
        plugin.rules
      ).sort(),

      [
        'component-prop-policy',
        'no-hardcoded-colors',
        'no-unknown-tokens',
        'prefer-design-system-components',
      ].sort()
    );
  }
);


test(
  'ESLint reports component prop policy violations',
  () => {
    const messages =
      lint(
        `
          import {
            Button,
          } from '@acme/ui';

          export const Example = () => (
            <Button variant="invalid">
              Save
            </Button>
          );
        `,

        {
          components: {
            button: {
              name: 'Button',
              from: '@acme/ui',

              props: {
                variant: {
                  allowed: [
                    'primary',
                    'secondary',
                  ],
                },
              },
            },
          },

          rules: {
            'component-prop-policy':
              'warn',

            'prefer-design-system-components':
              'off',

            'no-hardcoded-colors':
              'off',

            'no-unknown-tokens':
              'off',
          },
        }
      );

    assert.equal(
      messages.length,
      1
    );

    assert.equal(
      messages[0]?.ruleId,
      'design-system-guard/component-prop-policy'
    );

    assert.equal(
      messages[0]?.severity,
      1
    );
  }
);
