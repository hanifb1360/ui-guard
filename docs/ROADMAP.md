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

* SARIF output
* GitHub code-scanning annotations
* improved diagnostics
* configuration validation
* include and exclude patterns
* warning thresholds

## Phase 3 — ESLint integration

Build an ESLint adapter backed by the same rule implementations.

The CLI and ESLint integration must not maintain separate copies of rule logic.

## Phase 4 — Better design-system intelligence

Add:

* CSS token extraction
* JSON design-token extraction
* spacing token rules
* typography token rules
* component prop policies
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
