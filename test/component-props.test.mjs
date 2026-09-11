import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeSource,
} from '../dist/index.mjs';

function analyze(
  source,
  props
) {
  return analyzeSource({
    filePath:
      '/project/src/Example.tsx',

    source,

    config: {
      components: {
        button: {
          name: 'Button',
          from: '@acme/ui',
          props,
        },
      },

      rules: {
        'component-prop-policy':
          'error',

        'prefer-design-system-components':
          'off',

        'no-hardcoded-colors':
          'off',

        'no-unknown-tokens':
          'off',
      },
    },
  });
}

test(
  'reports an invalid static component prop value',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@acme/ui';

          export const Example = () => (
            <Button variant="banana">
              Save
            </Button>
          );
        `,

        {
          variant: {
            allowed: [
              'primary',
              'secondary',
              'danger',
            ],
          },
        }
      );

    assert.equal(
      diagnostics.length,
      1
    );

    assert.equal(
      diagnostics[0]?.ruleId,
      'component-prop-policy'
    );

    assert.match(
      diagnostics[0]?.message ?? '',
      /variant/
    );

    assert.match(
      diagnostics[0]?.suggestion ?? '',
      /primary/
    );
  }
);

test(
  'reports a missing required prop',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@acme/ui';

          export const Example = () => (
            <Button>
              Save
            </Button>
          );
        `,

        {
          variant: {
            required: true,
          },
        }
      );

    assert.equal(
      diagnostics.length,
      1
    );

    assert.match(
      diagnostics[0]?.message ?? '',
      /requires prop "variant"/
    );
  }
);

test(
  'reports a forbidden prop with a replacement',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@acme/ui';

          export const Example = () => (
            <Button destructive>
              Delete
            </Button>
          );
        `,

        {
          destructive: {
            forbidden: true,
            replacement:
              'variant',
          },
        }
      );

    assert.equal(
      diagnostics.length,
      1
    );

    assert.match(
      diagnostics[0]?.message ?? '',
      /forbidden/
    );

    assert.equal(
      diagnostics[0]?.suggestion,
      'Use "variant" instead.'
    );
  }
);

test(
  'reports a deprecated prop with a replacement',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@acme/ui';

          export const Example = () => (
            <Button color="danger">
              Delete
            </Button>
          );
        `,

        {
          color: {
            deprecated: true,
            replacement:
              'variant',
          },
        }
      );

    assert.equal(
      diagnostics.length,
      1
    );

    assert.match(
      diagnostics[0]?.message ?? '',
      /deprecated/
    );

    assert.equal(
      diagnostics[0]?.suggestion,
      'Use "variant" instead.'
    );
  }
);

test(
  'supports aliased named imports',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button as PrimaryButton,
          } from '@acme/ui';

          export const Example = () => (
            <PrimaryButton variant="invalid">
              Save
            </PrimaryButton>
          );
        `,

        {
          variant: {
            allowed: [
              'primary',
            ],
          },
        }
      );

    assert.equal(
      diagnostics.length,
      1
    );

    assert.equal(
      diagnostics[0]?.ruleId,
      'component-prop-policy'
    );
  }
);

test(
  'does not reject dynamic values that cannot be known statically',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@acme/ui';

          export function Example({
            variant
          }) {
            return (
              <Button variant={variant}>
                Save
              </Button>
            );
          }
        `,

        {
          variant: {
            allowed: [
              'primary',
              'secondary',
            ],
          },
        }
      );

    assert.deepEqual(
      diagnostics,
      []
    );
  }
);

test(
  'ignores a component with the same name imported from another package',
  () => {
    const diagnostics =
      analyze(
        `
          import {
            Button,
          } from '@other/ui';

          export const Example = () => (
            <Button variant="banana">
              Save
            </Button>
          );
        `,

        {
          variant: {
            allowed: [
              'primary',
            ],
          },
        }
      );

    assert.deepEqual(
      diagnostics,
      []
    );
  }
);
