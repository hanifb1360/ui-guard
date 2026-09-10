import {
  access,
} from 'node:fs/promises';

import {
  resolve,
} from 'node:path';

import {
  pathToFileURL,
} from 'node:url';

import type {
  RuleConfiguration,
  RuleId,
  RuleLevel,
  UIGuardConfig,
} from './types';

const DEFAULT_RULES: Required<RuleConfiguration> = {
  'no-hardcoded-colors': 'error',
  'prefer-design-system-components': 'error',
  'no-unknown-tokens': 'error',
};

export function defineConfig<T extends UIGuardConfig>(
  config: T
): T {
  return config;
}

export function normalizeConfig(
  config: UIGuardConfig = {}
): UIGuardConfig {
  return {
    components: {
      ...(config.components ?? {}),
    },

    tokens: [
      ...(config.tokens ?? []),
    ],

    rules: {
      ...DEFAULT_RULES,
      ...(config.rules ?? {}),
    },
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
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(
  cwd = process.cwd(),
  explicitPath?: string
): Promise<UIGuardConfig> {
  const candidates = explicitPath
    ? [
        resolve(cwd, explicitPath),
      ]
    : [
        resolve(cwd, 'ui-guard.config.mjs'),
        resolve(cwd, 'ui-guard.config.js'),
        resolve(cwd, 'ui-guard.config.cjs'),
      ];

  for (const candidate of candidates) {
    if (!(await exists(candidate))) {
      continue;
    }

    const imported = await import(
      pathToFileURL(candidate).href
    );

    const rawConfig = imported.default
      ?? imported;

    if (
      !rawConfig
      || typeof rawConfig !== 'object'
    ) {
      throw new TypeError(
        `Invalid ui-guard configuration in ${candidate}`
      );
    }

    return normalizeConfig(
      rawConfig as UIGuardConfig
    );
  }

  if (explicitPath) {
    throw new Error(
      `Could not find ui-guard config: ${explicitPath}`
    );
  }

  return normalizeConfig();
}
