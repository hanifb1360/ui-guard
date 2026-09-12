import type {
  ComponentPropValue,
  DesignSystemGuardConfig,
} from './types';

const ROOT_KEYS =
  new Set([
    'components',
    'tokens',
    'tokenSources',
    'rules',
  ]);

const COMPONENT_KEYS =
  new Set([
    'name',
    'from',
    'props',
  ]);

const PROP_POLICY_KEYS =
  new Set([
    'allowed',
    'required',
    'forbidden',
    'deprecated',
    'replacement',
  ]);

const TOKEN_SOURCE_KEYS =
  new Set([
    'path',
    'format',
  ]);

const RULE_IDS =
  new Set([
    'component-prop-policy',
    'no-hardcoded-colors',
    'prefer-design-system-components',
    'no-unknown-tokens',
  ]);

const RULE_LEVELS =
  new Set([
    'off',
    'warn',
    'error',
  ]);

const TOKEN_FORMATS =
  new Set([
    'css',
    'json',
  ]);

export class ConfigValidationError
  extends TypeError {
  readonly path: string;
  readonly reason: string;

  constructor(
    path: string,
    reason: string
  ) {
    super(
      `${path}: ${reason}`
    );

    this.name =
      'ConfigValidationError';

    this.path =
      path;

    this.reason =
      reason;
  }
}

function fail(
  path: string,
  reason: string
): never {
  throw new ConfigValidationError(
    path,
    reason
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
  );
}

function asRecord(
  value: unknown,
  path: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(
      path,
      'expected an object'
    );
  }

  return value;
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string
): void {
  for (
    const key
    of Object.keys(value)
  ) {
    if (!allowed.has(key)) {
      fail(
        path === 'config'
          ? key
          : `${path}.${key}`,

        'unknown configuration option'
      );
    }
  }
}

function requireNonEmptyString(
  value: unknown,
  path: string
): string {
  if (
    typeof value !== 'string'
    || value.trim() === ''
  ) {
    fail(
      path,
      'expected a non-empty string'
    );
  }

  return value;
}

function validateOptionalBoolean(
  value: unknown,
  path: string
): void {
  if (
    value !== undefined
    && typeof value !== 'boolean'
  ) {
    fail(
      path,
      'expected a boolean'
    );
  }
}

function isComponentPropValue(
  value: unknown
): value is ComponentPropValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return true;
  }

  return (
    typeof value === 'number'
    && Number.isFinite(value)
  );
}

function validateAllowedValues(
  value: unknown,
  path: string
): void {
  if (!Array.isArray(value)) {
    fail(
      path,
      'expected an array'
    );
  }

  if (value.length === 0) {
    fail(
      path,
      'must contain at least one allowed value'
    );
  }

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    if (
      !isComponentPropValue(
        value[index]
      )
    ) {
      fail(
        `${path}[${index}]`,
        'expected a string, finite number, boolean, or null'
      );
    }
  }
}

function validatePropPolicy(
  value: unknown,
  path: string
): void {
  const policy =
    asRecord(
      value,
      path
    );

  assertKnownKeys(
    policy,
    PROP_POLICY_KEYS,
    path
  );

  if (
    policy.allowed !== undefined
  ) {
    validateAllowedValues(
      policy.allowed,
      `${path}.allowed`
    );
  }

  validateOptionalBoolean(
    policy.required,
    `${path}.required`
  );

  validateOptionalBoolean(
    policy.forbidden,
    `${path}.forbidden`
  );

  validateOptionalBoolean(
    policy.deprecated,
    `${path}.deprecated`
  );

  if (
    policy.replacement !== undefined
  ) {
    requireNonEmptyString(
      policy.replacement,
      `${path}.replacement`
    );
  }

  const required =
    policy.required === true;

  const forbidden =
    policy.forbidden === true;

  const deprecated =
    policy.deprecated === true;

  const hasAllowed =
    policy.allowed !== undefined;

  const hasReplacement =
    policy.replacement !== undefined;

  if (
    required
    && forbidden
  ) {
    fail(
      path,
      'cannot be both required and forbidden'
    );
  }

  if (
    required
    && deprecated
  ) {
    fail(
      path,
      'cannot be both required and deprecated'
    );
  }

  if (
    forbidden
    && deprecated
  ) {
    fail(
      path,
      'cannot be both forbidden and deprecated'
    );
  }

  if (
    forbidden
    && hasAllowed
  ) {
    fail(
      path,
      'cannot define allowed values for a forbidden prop'
    );
  }

  if (
    deprecated
    && hasAllowed
  ) {
    fail(
      path,
      'cannot define allowed values for a deprecated prop'
    );
  }

  if (
    hasReplacement
    && !forbidden
    && !deprecated
  ) {
    fail(
      `${path}.replacement`,
      'requires forbidden or deprecated to be true'
    );
  }
}

function validateProps(
  value: unknown,
  path: string
): void {
  const props =
    asRecord(
      value,
      path
    );

  for (
    const [
      propName,
      policy,
    ]
    of Object.entries(props)
  ) {
    if (
      propName.trim() === ''
    ) {
      fail(
        path,
        'prop names must not be empty'
      );
    }

    validatePropPolicy(
      policy,
      `${path}.${propName}`
    );
  }
}

function validateComponents(
  value: unknown
): void {
  const components =
    asRecord(
      value,
      'components'
    );

  for (
    const [
      key,
      rawComponent,
    ]
    of Object.entries(
      components
    )
  ) {
    if (
      key.trim() === ''
    ) {
      fail(
        'components',
        'component keys must not be empty'
      );
    }

    const path =
      `components.${key}`;

    const component =
      asRecord(
        rawComponent,
        path
      );

    assertKnownKeys(
      component,
      COMPONENT_KEYS,
      path
    );

    requireNonEmptyString(
      component.name,
      `${path}.name`
    );

    requireNonEmptyString(
      component.from,
      `${path}.from`
    );

    if (
      component.props !== undefined
    ) {
      validateProps(
        component.props,
        `${path}.props`
      );
    }
  }
}

function validateTokens(
  value: unknown
): void {
  if (!Array.isArray(value)) {
    fail(
      'tokens',
      'expected an array'
    );
  }

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const token =
      value[index];

    const path =
      `tokens[${index}]`;

    requireNonEmptyString(
      token,
      path
    );

    if (
      typeof token === 'string'
      && !token.startsWith('--')
    ) {
      fail(
        path,
        'expected a CSS custom-property name beginning with "--"'
      );
    }
  }
}

function validateTokenSource(
  value: unknown,
  path: string
): void {
  if (typeof value === 'string') {
    requireNonEmptyString(
      value,
      path
    );

    return;
  }

  const source =
    asRecord(
      value,
      path
    );

  assertKnownKeys(
    source,
    TOKEN_SOURCE_KEYS,
    path
  );

  requireNonEmptyString(
    source.path,
    `${path}.path`
  );

  if (
    source.format !== undefined
  ) {
    if (
      typeof source.format !== 'string'
      || !TOKEN_FORMATS.has(
        source.format
      )
    ) {
      fail(
        `${path}.format`,
        'expected "css" or "json"'
      );
    }
  }
}

function validateTokenSources(
  value: unknown
): void {
  if (!Array.isArray(value)) {
    fail(
      'tokenSources',
      'expected an array'
    );
  }

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    validateTokenSource(
      value[index],
      `tokenSources[${index}]`
    );
  }
}

function validateRules(
  value: unknown
): void {
  const rules =
    asRecord(
      value,
      'rules'
    );

  for (
    const [
      ruleId,
      level,
    ]
    of Object.entries(rules)
  ) {
    const path =
      `rules.${ruleId}`;

    if (
      !RULE_IDS.has(
        ruleId
      )
    ) {
      fail(
        path,
        'unknown rule'
      );
    }

    if (level === undefined) {
      continue;
    }

    if (
      typeof level !== 'string'
      || !RULE_LEVELS.has(level)
    ) {
      fail(
        path,
        'expected "off", "warn", or "error"'
      );
    }
  }
}

export function validateConfig(
  config: unknown
): asserts config is DesignSystemGuardConfig {
  const root =
    asRecord(
      config,
      'config'
    );

  assertKnownKeys(
    root,
    ROOT_KEYS,
    'config'
  );

  if (
    root.components !== undefined
  ) {
    validateComponents(
      root.components
    );
  }

  if (
    root.tokens !== undefined
  ) {
    validateTokens(
      root.tokens
    );
  }

  if (
    root.tokenSources !== undefined
  ) {
    validateTokenSources(
      root.tokenSources
    );
  }

  if (
    root.rules !== undefined
  ) {
    validateRules(
      root.rules
    );
  }
}
