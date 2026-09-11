# ui-guard roadmap

## Phase 1 — Static-analysis core

Goal: prove that one configuration can enforce useful design-system rules.

Included in the initial MVP:

* TS, TSX, JS, and JSX parsing
* file discovery
* CLI
* JSON output
* design-system component policy
* hardcoded color detection
* design-token validation
* ESM and CommonJS programmatic API
* package consumer tests
* CI

## Phase 2 — Production CI integration

Add:

* [x] SARIF 2.1.0 output
* [x] GitHub code-scanning workflow documentation
* [ ] GitHub code-scanning annotations in the ui-guard repository demo
* improved diagnostics
* [x] runtime configuration validation with path-specific errors
* include and exclude patterns
* warning thresholds

## Phase 3 — ESLint integration

* [x] Flat-config compatible ESLint adapter
* [x] Reuse the same `ui-guard` analysis engine
* [x] Preserve `off`, `warn`, and `error` severity
* [x] Expose individual ESLint rule IDs
* [x] Test the packaged ESLint subpath export
* [ ] Add richer editor examples

The CLI and ESLint integration use the same analysis engine rather than maintaining separate copies of rule logic.

## Phase 4 — Better design-system intelligence

Add:

* [x] CSS custom-property token extraction
* [x] JSON design-token extraction
* spacing token rules
* typography token rules
* [x] component prop policies for allowed values, required props, forbidden props, and deprecations
* deprecated component detection
* approved replacement suggestions

## Phase 5 — AI coding-agent integration

Generate machine-readable instructions from the same ui-guard policy.

Potential outputs:

* AGENTS.md
* SKILL.md
* compact JSON policy
* MCP-readable metadata

The objective is for an AI coding agent to know which components and tokens it should use before generating UI code.

## Phase 6 — Ecosystem integration

Investigate:

* Storybook
* Figma design-token workflows
* Next.js
* GitHub pull requests
* VS Code diagnostics
* automated fixes
