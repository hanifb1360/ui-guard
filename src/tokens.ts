import {
  readFile,
} from 'node:fs/promises';

import {
  extname,
  resolve,
} from 'node:path';

import type {
  TokenSource,
  TokenSourceFormat,
  TokenSourceInput,
} from './types';

function unique(
  values: Iterable<string>
): string[] {
  return [
    ...new Set(values),
  ];
}

function stripCssComments(
  source: string
): string {
  return source.replace(
    /\/\*[\s\S]*?\*\//g,
    ''
  );
}

/**
 * Extract CSS custom-property declarations.
 *
 * Example:
 *
 * :root {
 *   --color-primary: #2563eb;
 * }
 */
export function extractCssCustomProperties(
  source: string
): string[] {
  const tokens =
    new Set<string>();

  const cleanSource =
    stripCssComments(source);

  const pattern =
    /(--[A-Za-z0-9_-]+)\s*:/g;

  for (
    const match
    of cleanSource.matchAll(pattern)
  ) {
    const token =
      match[1];

    if (token) {
      tokens.add(token);
    }
  }

  return [
    ...tokens,
  ];
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

function toKebabSegment(
  value: string
): string {
  return value
    .trim()
    .replace(
      /([a-z0-9])([A-Z])/g,
      '$1-$2'
    )
    .replace(
      /_/g,
      '-'
    )
    .replace(
      /[^A-Za-z0-9-]+/g,
      '-'
    )
    .replace(
      /-+/g,
      '-'
    )
    .replace(
      /^-|-$/g,
      ''
    )
    .toLowerCase();
}

function pathToCssVariable(
  path: string[]
): string | undefined {
  const segments =
    path
      .map(toKebabSegment)
      .filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  return `--${segments.join('-')}`;
}

function walkJsonTokens(
  value: unknown,
  path: string[],
  tokens: Set<string>
): void {
  if (!isRecord(value)) {
    return;
  }

  const hasTokenValue =
    Object.prototype.hasOwnProperty.call(
      value,
      '$value'
    )
    || Object.prototype.hasOwnProperty.call(
      value,
      'value'
    );

  if (
    hasTokenValue
    && path.length > 0
  ) {
    const generated =
      pathToCssVariable(path);

    if (generated) {
      tokens.add(generated);
    }
  }

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    if (key.startsWith('--')) {
      tokens.add(key);
      continue;
    }

    if (
      key === '$value'
      || key === 'value'
      || key.startsWith('$')
    ) {
      continue;
    }

    if (isRecord(child)) {
      walkJsonTokens(
        child,
        [
          ...path,
          key,
        ],
        tokens
      );
    }
  }
}

/**
 * Extract design tokens from JSON.
 *
 * Supported patterns include:
 *
 * {
 *   "--color-primary": "#2563eb"
 * }
 *
 * {
 *   "color": {
 *     "primary": {
 *       "$value": "#2563eb"
 *     }
 *   }
 * }
 *
 * {
 *   "color": {
 *     "primary": {
 *       "value": "#2563eb"
 *     }
 *   }
 * }
 */
export function extractJsonDesignTokens(
  source: string
): string[] {
  const parsed: unknown =
    JSON.parse(source);

  const tokens =
    new Set<string>();

  walkJsonTokens(
    parsed,
    [],
    tokens
  );

  return [
    ...tokens,
  ];
}

function inferFormat(
  filePath: string
): TokenSourceFormat {
  const extension =
    extname(filePath)
      .toLowerCase();

  if (extension === '.css') {
    return 'css';
  }

  if (extension === '.json') {
    return 'json';
  }

  throw new Error(
    `Unsupported token source format for "${filePath}". Use a .css or .json file, or specify the format explicitly.`
  );
}

function normalizeSource(
  source: TokenSourceInput
): TokenSource {
  if (typeof source === 'string') {
    return {
      path: source,
    };
  }

  if (
    !source
    || typeof source.path !== 'string'
    || source.path.trim() === ''
  ) {
    throw new TypeError(
      'A token source must contain a non-empty path.'
    );
  }

  return source;
}

export async function loadTokenSource(
  source: TokenSourceInput,
  cwd = process.cwd()
): Promise<string[]> {
  const normalized =
    normalizeSource(source);

  const absolutePath =
    resolve(
      cwd,
      normalized.path
    );

  const format =
    normalized.format
    ?? inferFormat(
      normalized.path
    );

  let contents: string;

  try {
    contents =
      await readFile(
        absolutePath,
        'utf8'
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    throw new Error(
      `Could not read token source "${normalized.path}": ${message}`
    );
  }

  if (format === 'css') {
    return extractCssCustomProperties(
      contents
    );
  }

  if (format === 'json') {
    try {
      return extractJsonDesignTokens(
        contents
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new Error(
        `Could not parse JSON token source "${normalized.path}": ${message}`
      );
    }
  }

  throw new Error(
    `Unsupported token source format "${String(format)}".`
  );
}

export async function loadTokenSources(
  sources: readonly TokenSourceInput[],
  cwd = process.cwd()
): Promise<string[]> {
  const discovered: string[] = [];

  for (const source of sources) {
    discovered.push(
      ...(await loadTokenSource(
        source,
        cwd
      ))
    );
  }

  return unique(
    discovered
  );
}
