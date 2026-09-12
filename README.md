# design-system-guard

A TypeScript policy engine for enforcing design-system rules across React code, CI, and AI-assisted development.

`design-system-guard` analyzes JavaScript, TypeScript, JSX, and TSX source code and reports UI code that violates the design-system policy defined by a project.

The long-term goal is simple:

> Define UI policy once and make it usable by developers, CI, and AI coding agents.

## Why design-system-guard?

Modern React teams increasingly maintain internal design systems while both developers and AI coding tools generate application code.

That creates a recurring problem:

* raw HTML elements bypass approved components
* colors and spacing are invented instead of using tokens
* design-system rules are documented but not enforced
* AI coding agents do not automatically know a company's UI constraints

`design-system-guard` turns part of that design-system policy into machine-readable rules.

## Current MVP

The current MVP implements four rules:

### `prefer-design-system-components`

Reports raw HTML elements when the project has configured an approved component.

Instead of:

```tsx
<button>
  Save
</button>
```

a project can require:

```tsx
<Button>
  Save
</Button>
```

### `no-hardcoded-colors`

Reports literal colors inside JSX style properties.

For example:

```tsx
<div
  style={{
    color: '#ffffff',
  }}
/>
```

### `component-prop-policy`

Enforces configured contracts for approved design-system component props, including allowed values, required props, forbidden props, and deprecations.

### `no-unknown-tokens`

Checks CSS custom properties against the configured design-token list.

For example:

```tsx
<div
  style={{
    color: 'var(--color-brand)',
  }}
/>
```

can be rejected when `--color-brand` is not an approved token.

## Configuration

Create:

```text
design-system-guard.config.mjs
```

Example:

```js
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
    '--color-danger',
    '--color-surface',
  ],

  rules: {
    'no-hardcoded-colors': 'error',
    'prefer-design-system-components': 'error',
    'no-unknown-tokens': 'error',
  },
};

export default config;
```

## Configuration validation

`design-system-guard` validates its configuration at runtime, including JavaScript configuration files.

Validation covers:

- supported top-level options
- component `name` and `from` fields
- component prop policies
- allowed prop values
- contradictory prop policies
- CSS custom-property token names
- token-source objects and formats
- known rule IDs
- `off`, `warn`, and `error` rule levels

Configuration errors include the exact path that needs attention.

For example:

```text
rules.component-prop-policy: expected "off", "warn", or "error"
```

or:

```text
components.button.props.variant.allowed[2]: expected a string, finite number, boolean, or null
```

The same validation is used by the CLI, programmatic API, analyzer, and ESLint adapter.

For programmatic validation:

```ts
import {
  ConfigValidationError,
  validateConfig,
} from 'design-system-guard';

try {
  validateConfig(config);
} catch (error) {
  if (
    error instanceof
      ConfigValidationError
  ) {
    console.error(
      error.path,
      error.reason,
    );
  }
}
```

`defineConfig()` also validates before returning the configuration:

```ts
import {
  defineConfig,
} from 'design-system-guard';

export default defineConfig({
  rules: {
    'component-prop-policy':
      'error',
  },
});
```

## Component prop policies

`design-system-guard` can enforce the public prop contract of an approved design-system component.

```js
const config = {
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',

      props: {
        variant: {
          allowed: [
            'primary',
            'secondary',
            'danger',
          ],
        },

        size: {
          allowed: [
            'sm',
            'md',
            'lg',
          ],
        },

        ariaLabel: {
          required: true,
        },

        debug: {
          forbidden: true,
        },

        legacyColor: {
          deprecated: true,
          replacement: 'variant',
        },
      },
    },
  },
};

export default config;
```

Given:

```tsx
import {
  Button,
} from '@acme/ui';

export function Example() {
  return (
    <Button
      variant="banana"
      size="huge"
      debug
      legacyColor="red"
    >
      Save
    </Button>
  );
}
```

`design-system-guard` can report:

```text
<Button> prop "variant" received "banana", which is not allowed.
Allowed values: "primary", "secondary", "danger".

<Button> prop "size" received "huge", which is not allowed.
Allowed values: "sm", "md", "lg".

<Button> requires prop "ariaLabel".

Prop "debug" is forbidden on <Button>.

Prop "legacyColor" is deprecated on <Button>.
Use "variant" instead.
```

The `component-prop-policy` rule verifies that the JSX component comes from the configured package before applying the contract. Named import aliases are supported:

```tsx
import {
  Button as PrimaryButton,
} from '@acme/ui';

<PrimaryButton variant="primary" />
```

Allowed-value validation is conservative. Literal strings, numbers, booleans, `null`, negative numeric literals, boolean shorthand props, and expression-free template literals can be checked statically. Dynamic expressions are left alone because their runtime value cannot be determined safely:

```tsx
<Button variant={variantFromApi} />
```

Presence-based policies such as `required`, `forbidden`, and `deprecated` are still enforceable regardless of a prop's runtime value.

## Design-token sources

Token names do not have to be copied manually into the configuration.

`design-system-guard` can discover tokens from CSS and JSON files:

```js
const config = {
  tokenSources: [
    './src/styles/tokens.css',
    './design-tokens.json',
  ],
};

export default config;
```

Paths are resolved relative to the configuration file.

### CSS

Given:

```css
:root {
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --space-md: 16px;
}
```

`design-system-guard` discovers:

```text
--color-primary
--color-surface
--space-md
```

### JSON

Explicit CSS custom-property keys are supported:

```json
{
  "--color-primary": "#2563eb"
}
```

Nested token objects using `$value` are also supported:

```json
{
  "color": {
    "primary": {
      "$value": "#2563eb"
    }
  }
}
```

This becomes:

```text
--color-primary
```

Objects using a `value` field are supported in the same way:

```json
{
  "spacing": {
    "medium": {
      "value": "16px"
    }
  }
}
```

which becomes:

```text
--spacing-medium
```

Manual tokens and discovered tokens can be combined:

```js
const config = {
  tokens: [
    '--temporary-token',
  ],

  tokenSources: [
    './tokens.css',
  ],
};
```

Duplicate token names are removed automatically.

For programmatic use, `resolveConfig()` performs token-source loading:

```ts
import {
  resolveConfig,
} from 'design-system-guard';

const config = await resolveConfig(
  {
    tokenSources: [
      './tokens.css',
    ],
  },

  process.cwd(),
);
```

When using `loadConfig()`, token sources are resolved automatically.

## CLI

Check the default `src` directory:

```bash
npx design-system-guard check
```

Check several directories:

```bash
npx design-system-guard check src app components
```

Use an explicit configuration:

```bash
npx design-system-guard check src \
  --config design-system-guard.config.mjs
```

Machine-readable JSON output:

```bash
npx design-system-guard check src --json
```

Generate SARIF 2.1.0 output for CI and code-scanning tools:

```bash
npx design-system-guard check src --sarif design-system-guard.sarif
```

Generate an initial configuration:

```bash
npx design-system-guard init
```

## Example diagnostics

```text
src/Checkout.tsx:3:5  error  prefer-design-system-components
  Raw <button> used where a design-system component is configured.
  Suggestion: Use <Button> from @acme/ui.

src/Checkout.tsx:5:16  error  no-hardcoded-colors
  Hardcoded color "#ffffff" found in a JSX style property.

src/Checkout.tsx:6:21  error  no-unknown-tokens
  Unknown design token "--color-brand".
```

## ESLint integration

The CLI and ESLint integration use the same `design-system-guard` policy engine.

```bash
npm install -D eslint design-system-guard
```

With ESLint flat config:

```js
import {
  createEslintConfig,
} from 'design-system-guard/eslint';

import uiPolicy
  from './design-system-guard.config.mjs';

export default [
  {
    files: [
      '**/*.{js,jsx}',
    ],

    ...createEslintConfig(
      uiPolicy
    ),

    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
```

For TypeScript and TSX projects, keep using the project's normal TypeScript-aware ESLint parser. `design-system-guard` reuses ESLint's source text and does not replace the project's parser.

The adapter exposes:

```text
design-system-guard/component-prop-policy
design-system-guard/prefer-design-system-components
design-system-guard/no-hardcoded-colors
design-system-guard/no-unknown-tokens
```

The same `off`, `warn`, and `error` values in the `design-system-guard` policy control ESLint severity.

## GitHub code scanning

`design-system-guard` can generate SARIF 2.1.0 so violations can be uploaded to GitHub code scanning.

A GitHub Actions workflow can run the analyzer, upload its diagnostics, and still fail the build when policy errors are found:

```yaml
name: Design System Guard

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read
  security-events: write

jobs:
  design-system-guard:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Set up Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run design-system-guard
        id: design_system_guard
        continue-on-error: true
        run: npx design-system-guard check src --sarif design-system-guard.sarif

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: design-system-guard.sarif
          category: design-system-guard

      - name: Fail on policy violations
        if: steps.design_system_guard.outcome == 'failure'
        run: exit 1
```

The analyzer writes the SARIF file before returning a non-zero exit code, allowing CI to upload diagnostics and then enforce the policy.

This repository also contains a live demonstration workflow:

```text
.github/workflows/design-system-guard-code-scanning.yml
```

It builds `design-system-guard`, scans the intentionally invalid `examples/acme` project, verifies that the generated SARIF contains exactly the three expected findings, and uploads those results to GitHub Code Scanning.

The demo workflow expects the example analyzer command itself to exit with status `1`. That non-zero result represents the deliberately configured policy violations; the workflow validates those findings before uploading them.

For pull requests from forks, SARIF upload is skipped because GitHub does not grant the same write permissions to untrusted fork workflows. Pushes to `main` perform the real repository Code Scanning upload.

## Programmatic API

```ts
import {
  analyzeSource,
  defineConfig,
} from 'design-system-guard';

const config = defineConfig({
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },
  },

  tokens: [
    '--color-primary',
  ],
});

const diagnostics = analyzeSource({
  filePath: 'Example.tsx',

  source: `
    export function Example() {
      return <button>Save</button>;
    }
  `,

  config,
});
```

## Development

Install dependencies:

```bash
npm ci
```

Run tests:

```bash
npm test
```

Test the packed npm package:

```bash
npm run test:consumer
```

Run the example:

```bash
npm run demo
```

The example intentionally contains violations, so the demo command exits with a non-zero status.

## Project direction

The current MVP includes the static-analysis core, CLI, ESLint adapter, SARIF output, GitHub Code Scanning integration, CSS and JSON token sources, component prop contracts, and runtime configuration validation.

Future work includes:

* autofix and structured replacement suggestions
* accessibility-aware design-system policies
* spacing and typography policies
* Storybook integration
* machine-readable policy output for AI coding agents
* generated agent skills and project instructions

See `docs/ROADMAP.md`.

## License

MIT
