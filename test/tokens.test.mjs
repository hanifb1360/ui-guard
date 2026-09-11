import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import {
  tmpdir,
} from 'node:os';

import {
  join,
} from 'node:path';

import {
  extractCssCustomProperties,
  extractJsonDesignTokens,
  loadConfig,
  resolveConfig,
} from '../dist/index.mjs';

test(
  'extracts CSS custom-property declarations and ignores comments',
  () => {
    const tokens =
      extractCssCustomProperties(`
        /*
         * --ignored-token: red;
         */

        :root {
          --color-primary: #2563eb;
          --color-surface: #ffffff;
        }

        .dark {
          --color-surface: #111827;
          --space-md: 16px;
        }
      `);

    assert.deepEqual(
      tokens,
      [
        '--color-primary',
        '--color-surface',
        '--space-md',
      ]
    );
  }
);

test(
  'extracts explicit, DTCG-style, and value-style JSON tokens',
  () => {
    const tokens =
      extractJsonDesignTokens(
        JSON.stringify({
          '--radius-card':
            '12px',

          color: {
            primary: {
              $value:
                '#2563eb',
            },

            danger: {
              value:
                '#dc2626',
            },
          },

          spacing: {
            small: {
              $value:
                '8px',
            },
          },
        })
      );

    assert.deepEqual(
      tokens.sort(),
      [
        '--color-danger',
        '--color-primary',
        '--radius-card',
        '--spacing-small',
      ].sort()
    );
  }
);

test(
  'merges manual tokens with CSS and JSON token sources',
  async () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'ui-guard-tokens-'
        )
      );

    try {
      writeFileSync(
        join(
          directory,
          'tokens.css'
        ),
        `
          :root {
            --color-primary: #2563eb;
            --space-md: 16px;
          }
        `
      );

      writeFileSync(
        join(
          directory,
          'tokens.json'
        ),
        JSON.stringify({
          color: {
            danger: {
              $value:
                '#dc2626',
            },
          },

          '--space-md':
            '16px',
        })
      );

      const config =
        await resolveConfig(
          {
            tokens: [
              '--manual-token',
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
          },

          directory
        );

      assert.deepEqual(
        config.tokens,
        [
          '--manual-token',
          '--color-primary',
          '--space-md',
          '--color-danger',
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
  'loadConfig resolves token sources relative to the config file',
  async () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'ui-guard-config-'
        )
      );

    try {
      const configDirectory =
        join(
          directory,
          'config'
        );

      mkdirSync(
        configDirectory
      );

      writeFileSync(
        join(
          configDirectory,
          'tokens.css'
        ),
        `
          :root {
            --brand-primary: #2563eb;
          }
        `
      );

      writeFileSync(
        join(
          configDirectory,
          'ui-guard.config.mjs'
        ),
        `
          export default {
            tokenSources: [
              './tokens.css'
            ]
          };
        `
      );

      const config =
        await loadConfig(
          directory,
          'config/ui-guard.config.mjs'
        );

      assert.deepEqual(
        config.tokens,
        [
          '--brand-primary',
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
  'rejects unsupported token-source formats',
  async () => {
    const directory =
      mkdtempSync(
        join(
          tmpdir(),
          'ui-guard-format-'
        )
      );

    try {
      await assert.rejects(
        () =>
          resolveConfig(
            {
              tokenSources: [
                './tokens.txt',
              ],
            },
            directory
          ),

        /Unsupported token source format/
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
