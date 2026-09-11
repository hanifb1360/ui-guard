# ui-guard

A TypeScript policy engine for enforcing design-system rules across React code, CI, and AI-assisted development.

`ui-guard` analyzes JavaScript, TypeScript, JSX, and TSX source code and reports UI code that violates the design-system policy defined by a project.

The long-term goal is simple:

> Define UI policy once and make it usable by developers, CI, and AI coding agents.

## Why ui-guard?

Modern React teams increasingly maintain internal design systems while both developers and AI coding tools generate application code.

That creates a recurring problem:

* raw HTML elements bypass approved components
* colors and spacing are invented instead of using tokens
* design-system rules are documented but not enforced
* AI coding agents do not automatically know a company's UI constraints

`ui-guard` turns part of that design-system policy into machine-readable rules.

## Current MVP

The first version implements three rules:

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
ui-guard.config.mjs
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

## CLI

Check the default `src` directory:

```bash
ui-guard check
```

Check several directories:

```bash
ui-guard check src app components
```

Use an explicit configuration:

```bash
ui-guard check src \
  --config ui-guard.config.mjs
```

Machine-readable JSON output:

```bash
ui-guard check src --json
```

Generate SARIF 2.1.0 output for CI and code-scanning tools:

```bash
ui-guard check src --sarif ui-guard.sarif
```

Generate an initial configuration:

```bash
ui-guard init
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

The CLI and ESLint integration use the same `ui-guard` policy engine.

```bash
npm install -D eslint @hb1360/ui-guard
```

With ESLint flat config:

```js
import {
  createEslintConfig,
} from '@hb1360/ui-guard/eslint';

import uiPolicy
  from './ui-guard.config.mjs';

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

For TypeScript and TSX projects, keep using the project's normal TypeScript-aware ESLint parser. `ui-guard` reuses ESLint's source text and does not replace the project's parser.

The adapter exposes:

```text
ui-guard/prefer-design-system-components
ui-guard/no-hardcoded-colors
ui-guard/no-unknown-tokens
```

The same `off`, `warn`, and `error` values in the `ui-guard` policy control ESLint severity.

## GitHub code scanning

`ui-guard` can generate SARIF 2.1.0 so violations can be uploaded to GitHub code scanning.

A GitHub Actions workflow can run the analyzer, upload its diagnostics, and still fail the build when policy errors are found:

```yaml
name: UI Guard

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read
  security-events: write

jobs:
  ui-guard:
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

      - name: Run ui-guard
        id: ui_guard
        continue-on-error: true
        run: npx ui-guard check src --sarif ui-guard.sarif

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: ui-guard.sarif
          category: ui-guard

      - name: Fail on policy violations
        if: steps.ui_guard.outcome == 'failure'
        run: exit 1
```

The analyzer writes the SARIF file before returning a non-zero exit code, allowing CI to upload diagnostics and then enforce the policy.

## Programmatic API

```ts
import {
  analyzeSource,
  defineConfig,
} from '@hb1360/ui-guard';

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

The MVP focuses on a small static-analysis core.

Planned areas include:

* SARIF output for GitHub code scanning
* ESLint integration backed by the same rule engine
* autofix and structured replacement suggestions
* accessibility-aware design-system policies
* Storybook integration
* machine-readable policy output for AI coding agents
* generated agent skills and project instructions
* richer token sources such as CSS and design-token files

See `docs/ROADMAP.md`.

## License

MIT
