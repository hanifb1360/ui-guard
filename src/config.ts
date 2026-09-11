import {
  access,
} from 'node:fs/promises';

import {
  dirname,
  resolve,
} from 'node:path';

import {
  pathToFileURL,
} from 'node:url';

import {
  loadTokenSources,
} from './tokens';

import {
  ConfigValidationError,
  validateConfig,
} from './validation';

import type {
  RuleConfiguration,
  RuleId,
  RuleLevel,
  UIGuardConfig,
} from './types';

const DEFAULT_RULES:
  Required<RuleConfiguration> = {
    'component-prop-policy':
      'error',

    'no-hardcoded-colors':
      'error',

    'prefer-design-system-components':
      'error',

    'no-unknown-tokens':
      'error',
  };

export function defineConfig<
  T extends UIGuardConfig
>(
  config: T
): T {
  validateConfig(
    config
  );

  return config;
}

export function normalizeConfig(
  config: UIGuardConfig = {}
): UIGuardConfig {
  validateConfig(
    config
  );

  return {
    components: {
      ...(config.components ?? {}),
    },

    tokens: [
      ...(config.tokens ?? []),
    ],

    tokenSources: [
      ...(config.tokenSources ?? []),
    ],

    rules: {
      ...DEFAULT_RULES,
      ...(config.rules ?? {}),
    },
  };
}

export async function resolveConfig(
  config: UIGuardConfig = {},
  cwd = process.cwd()
): Promise<UIGuardConfig> {
  const normalized =
    normalizeConfig(
      config
    );

  const discoveredTokens =
    await loadTokenSources(
      normalized.tokenSources ?? [],
      cwd
    );

  return {
    ...normalized,

    tokens: [
      ...new Set([
        ...(normalized.tokens ?? []),
        ...discoveredTokens,
      ]),
    ],
  };
}

export function getRuleLevel(
  config: UIGuardConfig,
  ruleId: RuleId
): RuleLevel {
  return config.rules?.[ruleId]
    ?? DEFAULT_RULES[ruleId];
}

async function exists(
  filePath: string
): Promise<boolean> {
  try {
    await access(
      filePath
    );

    return true;
  } catch {
    return false;
  }
}

function validationErrorForFile(
  error: ConfigValidationError,
  filePath: string
): ConfigValidationError {
  return new ConfigValidationError(
    error.path,
    `${error.reason}. Config file: ${filePath}`
  );
}

export async function loadConfig(
  cwd = process.cwd(),
  explicitPath?: string
): Promise<UIGuardConfig> {
  const candidates =
    explicitPath
      ? [
          resolve(
            cwd,
            explicitPath
          ),
        ]
      : [
          resolve(
            cwd,
            'ui-guard.config.mjs'
          ),

          resolve(
            cwd,
            'ui-guard.config.js'
          ),

          resolve(
            cwd,
            'ui-guard.config.cjs'
          ),
        ];

  for (
    const candidate
    of candidates
  ) {
    if (
      !(await exists(
        candidate
      ))
    ) {
      continue;
    }

    const imported =
      await import(
        pathToFileURL(
          candidate
        ).href
      );

    const rawConfig =
      imported.default
      ?? imported;

    try {
      return await resolveConfig(
        rawConfig as UIGuardConfig,
        dirname(candidate)
      );
    } catch (error) {
      if (
        error
        instanceof ConfigValidationError
      ) {
        throw validationErrorForFile(
          error,
          candidate
        );
      }

      throw error;
    }
  }

  if (explicitPath) {
    throw new Error(
      `Could not find ui-guard config: ${explicitPath}`
    );
  }

  return resolveConfig(
    {},
    cwd
  );
}
