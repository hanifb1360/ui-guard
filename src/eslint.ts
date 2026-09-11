import {
  analyzeSource,
} from './analyzer';

import {
  getRuleLevel,
  normalizeConfig,
} from './config';

import type {
  Diagnostic,
  RuleId,
  RuleLevel,
  UIGuardConfig,
} from './types';

export interface EslintSourceCodeLike {
  text: string;
}

export interface EslintRuleContextLike {
  filename?: string;
  sourceCode?: EslintSourceCodeLike;

  getFilename?:
    () => string;

  getSourceCode?:
    () => EslintSourceCodeLike;

  report(
    descriptor: {
      loc: {
        line: number;
        column: number;
      };

      message: string;
    }
  ): void;
}

export interface EslintRuleLike {
  meta: {
    type: 'problem';

    docs: {
      description: string;
    };

    schema: [];
  };

  create(
    context: EslintRuleContextLike
  ): {
    'Program:exit':
      () => void;
  };
}

export interface UIGuardEslintPlugin {
  meta: {
    name: string;
  };

  rules:
    Record<
      RuleId,
      EslintRuleLike
    >;
}

export interface UIGuardFlatEslintConfig {
  plugins: {
    'ui-guard':
      UIGuardEslintPlugin;
  };

  rules:
    Record<
      `ui-guard/${RuleId}`,
      RuleLevel
    >;
}

const RULE_IDS:
  readonly RuleId[] = [
    'component-prop-policy',
    'prefer-design-system-components',
    'no-hardcoded-colors',
    'no-unknown-tokens',
  ];

const RULE_DESCRIPTIONS:
  Record<RuleId, string> = {
    'component-prop-policy':
      'Enforce configured contracts for design-system component props.',

    'prefer-design-system-components':
      'Prefer configured design-system components over raw HTML elements.',

    'no-hardcoded-colors':
      'Avoid hardcoded colors when design tokens should be used.',

    'no-unknown-tokens':
      'Only use design tokens declared by the project policy.',
  };

function getSourceCode(
  context: EslintRuleContextLike
): EslintSourceCodeLike {
  if (context.sourceCode) {
    return context.sourceCode;
  }

  if (context.getSourceCode) {
    return context.getSourceCode();
  }

  throw new Error(
    'ui-guard could not access ESLint SourceCode.'
  );
}

function getFilename(
  context: EslintRuleContextLike
): string {
  if (
    context.filename
    && context.filename !== '<input>'
  ) {
    return context.filename;
  }

  if (context.getFilename) {
    return context.getFilename();
  }

  return '<input>';
}

function formatDiagnostic(
  diagnostic: Diagnostic
): string {
  if (!diagnostic.suggestion) {
    return diagnostic.message;
  }

  return `${diagnostic.message} ${diagnostic.suggestion}`;
}

export function createEslintPlugin(
  config: UIGuardConfig = {}
): UIGuardEslintPlugin {
  const normalizedConfig =
    normalizeConfig(config);

  const cache =
    new WeakMap<
      object,
      Diagnostic[]
    >();

  function getDiagnostics(
    context:
      EslintRuleContextLike
  ): Diagnostic[] {
    const sourceCode =
      getSourceCode(context);

    const cacheKey =
      sourceCode as object;

    const existing =
      cache.get(cacheKey);

    if (existing) {
      return existing;
    }

    const diagnostics =
      analyzeSource({
        filePath:
          getFilename(context),

        source:
          sourceCode.text,

        config:
          normalizedConfig,
      });

    cache.set(
      cacheKey,
      diagnostics
    );

    return diagnostics;
  }

  const rules =
    {} as Record<
      RuleId,
      EslintRuleLike
    >;

  for (
    const ruleId
    of RULE_IDS
  ) {
    rules[ruleId] = {
      meta: {
        type: 'problem',

        docs: {
          description:
            RULE_DESCRIPTIONS[
              ruleId
            ],
        },

        schema: [],
      },

      create(context) {
        return {
          'Program:exit': () => {
            const diagnostics =
              getDiagnostics(
                context
              );

            for (
              const diagnostic
              of diagnostics
            ) {
              if (
                diagnostic.ruleId
                !== ruleId
              ) {
                continue;
              }

              context.report({
                loc: {
                  line:
                    diagnostic.line,

                  column:
                    Math.max(
                      0,
                      diagnostic.column
                        - 1
                    ),
                },

                message:
                  formatDiagnostic(
                    diagnostic
                  ),
              });
            }
          },
        };
      },
    };
  }

  return {
    meta: {
      name:
        'design-system-guard',
    },

    rules,
  };
}

export function createEslintConfig(
  config: UIGuardConfig = {}
): UIGuardFlatEslintConfig {
  const normalizedConfig =
    normalizeConfig(config);

  const plugin =
    createEslintPlugin(
      normalizedConfig
    );

  const rules =
    {} as Record<
      `ui-guard/${RuleId}`,
      RuleLevel
    >;

  for (
    const ruleId
    of RULE_IDS
  ) {
    rules[
      `ui-guard/${ruleId}`
    ] = getRuleLevel(
      normalizedConfig,
      ruleId
    );
  }

  return {
    plugins: {
      'ui-guard':
        plugin,
    },

    rules,
  };
}
