# Changelog

All notable changes to `design-system-guard` will be documented here.

The project follows Semantic Versioning.

## Unreleased

## 0.1.5 - 2026-09-12

### Changed

* Standardized README product branding as `design-system-guard`.

## 0.1.4 - 2026-09-12

### Changed

* Improved README wording.

## 0.1.3 - 2026-09-12

### Changed

* Updated GitHub repository, issue, homepage, and SARIF documentation links after the repository rename.

## 0.1.2 - 2026-09-12

### Changed

* Clarified npm branding: the package is `design-system-guard` while the CLI remains `ui-guard`.

## 0.1.1 - 2026-09-11

### Changed

* Renamed the npm package from `@hb1360/ui-guard` to `design-system-guard`.
* The ESLint adapter is now imported from `design-system-guard/eslint`.

## 0.1.0 - 2026-09-11

### Added

* Initial static-analysis engine.
* React JSX and TypeScript parsing.
* `prefer-design-system-components` rule.
* `no-hardcoded-colors` rule.
* `no-unknown-tokens` rule.
* CLI with human-readable and JSON output.
* Programmatic analysis API.
* JavaScript configuration loading.
* ESM and CommonJS package builds.
* Package consumer tests.
* GitHub Actions CI.
* SARIF 2.1.0 output for code-scanning integrations.
* `--sarif` CLI output with file, line, column, rule, severity, and suggestion metadata.
* ESLint flat-config adapter backed by the same `ui-guard` analysis engine.
* `@hb1360/ui-guard/eslint` package export.
* Shared `off`, `warn`, and `error` severity between CLI and ESLint.
* CSS custom-property token-source discovery.
* JSON token-source discovery for explicit CSS variables, `$value`, and `value` token objects.
* Config-relative token-source resolution with manual/discovered token merging and deduplication.
* Component prop contracts for allowed values, required props, forbidden props, and deprecated props.
* Import-source-aware component matching with support for aliased named imports.
* Runtime configuration validation with path-specific error messages.
* Validation for rule levels, component definitions, prop policies, tokens, and token sources.
* Modernized `ui-guard init` template with component prop policies and all current rules.
* Live GitHub Code Scanning demo workflow backed by `ui-guard` SARIF output.
* CI verification that the demo SARIF contains the expected rule IDs and result count.

### Changed

* Marked the ESLint peer dependency as optional so CLI and core API consumers do not need ESLint installed.
* Updated documentation to include all four public rules.
* Marked the live GitHub Code Scanning integration as verified on `main`.
