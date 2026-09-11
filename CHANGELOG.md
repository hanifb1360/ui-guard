# Changelog

All notable changes to `ui-guard` will be documented here.

The project follows Semantic Versioning.

## Unreleased

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
