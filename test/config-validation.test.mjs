import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ConfigValidationError,
  defineConfig,
  normalizeConfig,
  validateConfig,
} from '../dist/index.mjs';

function expectConfigError(
  config,
  expectedPath,
  messagePattern
) {
  assert.throws(
    () =>
      validateConfig(
        config
      ),

    error => {
      assert.equal(
        error instanceof
          ConfigValidationError,
        true
      );

      assert.equal(
        error.path,
        expectedPath
      );

      assert.match(
        error.message,
        messagePattern
      );

      return true;
    }
  );
}

test(
  'accepts a complete valid configuration',
  () => {
    const config =
      defineConfig({
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

                required: true,
              },

              legacyColor: {
                deprecated: true,
                replacement:
                  'variant',
              },

              debug: {
                forbidden: true,
              },
            },
          },
        },

        tokens: [
          '--color-primary',
        ],

        tokenSources: [
          './tokens.css',

          {
            path:
              './tokens.json',

            format:
              'json',
          },
        ],

        rules: {
          'component-prop-policy':
            'error',

          'no-hardcoded-colors':
            'warn',

          'prefer-design-system-components':
            'error',

          'no-unknown-tokens':
            'off',
        },
      });

    assert.equal(
      normalizeConfig(
        config
      ).rules
        ?.['component-prop-policy'],
      'error'
    );
  }
);

test(
  'rejects unknown root configuration keys',
  () => {
    expectConfigError(
      {
        tokenSource:
          './tokens.css',
      },

      'tokenSource',

      /unknown configuration option/
    );
  }
);

test(
  'rejects invalid rule levels with an exact path',
  () => {
    expectConfigError(
      {
        rules: {
          'component-prop-policy':
            'fatal',
        },
      },

      'rules.component-prop-policy',

      /expected "off", "warn", or "error"/
    );
  }
);

test(
  'rejects invalid component identity fields',
  () => {
    expectConfigError(
      {
        components: {
          button: {
            name: '',
            from: '@acme/ui',
          },
        },
      },

      'components.button.name',

      /expected a non-empty string/
    );
  }
);

test(
  'reports the exact invalid allowed-value index',
  () => {
    expectConfigError(
      {
        components: {
          button: {
            name: 'Button',
            from: '@acme/ui',

            props: {
              variant: {
                allowed: [
                  'primary',
                  {
                    bad:
                      true,
                  },
                ],
              },
            },
          },
        },
      },

      'components.button.props.variant.allowed[1]',

      /expected a string, finite number, boolean, or null/
    );
  }
);

test(
  'rejects contradictory required and forbidden prop policies',
  () => {
    expectConfigError(
      {
        components: {
          button: {
            name: 'Button',
            from: '@acme/ui',

            props: {
              variant: {
                required: true,
                forbidden: true,
              },
            },
          },
        },
      },

      'components.button.props.variant',

      /cannot be both required and forbidden/
    );
  }
);

test(
  'requires replacement suggestions to accompany deprecated or forbidden props',
  () => {
    expectConfigError(
      {
        components: {
          button: {
            name: 'Button',
            from: '@acme/ui',

            props: {
              color: {
                replacement:
                  'variant',
              },
            },
          },
        },
      },

      'components.button.props.color.replacement',

      /requires forbidden or deprecated/
    );
  }
);

test(
  'rejects malformed manual token names',
  () => {
    expectConfigError(
      {
        tokens: [
          'color-primary',
        ],
      },

      'tokens[0]',

      /beginning with "--"/
    );
  }
);

test(
  'rejects malformed token source objects',
  () => {
    expectConfigError(
      {
        tokenSources: [
          {
            path:
              './tokens.data',

            format:
              'yaml',
          },
        ],
      },

      'tokenSources[0].format',

      /expected "css" or "json"/
    );
  }
);
