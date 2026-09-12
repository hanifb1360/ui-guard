import {
  getRuleLevel,
} from '../config';

import type {
  Diagnostic,
  DesignSystemGuardConfig,
} from '../types';

import {
  walkAst,
  type AstNode,
} from '../utils/ast';

import {
  createDiagnostic,
} from '../utils/diagnostic';

const RULE_ID =
  'no-unknown-tokens';

const TOKEN_PATTERN =
  /var\(\s*(--[A-Za-z0-9_-]+)(?:\s*,[^)]*)?\s*\)/g;

function getLiteralText(
  node: AstNode
): string | undefined {
  if (
    node.type === 'StringLiteral'
    && typeof node.value === 'string'
  ) {
    return node.value;
  }

  if (node.type === 'TemplateElement') {
    const value = node.value;

    if (
      value
      && typeof value === 'object'
      && 'raw' in value
      && typeof (
        value as { raw?: unknown }
      ).raw === 'string'
    ) {
      return (
        value as { raw: string }
      ).raw;
    }
  }

  return undefined;
}

export function checkNoUnknownTokens(
  ast: AstNode,
  filePath: string,
  config: DesignSystemGuardConfig
): Diagnostic[] {
  const level = getRuleLevel(
    config,
    RULE_ID
  );

  if (level === 'off') {
    return [];
  }

  const allowed = new Set(
    config.tokens ?? []
  );

  if (allowed.size === 0) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  walkAst(ast, node => {
    const text = getLiteralText(node);

    if (!text) {
      return;
    }

    for (
      const match of text.matchAll(TOKEN_PATTERN)
    ) {
      const token = match[1];

      if (
        !token
        || allowed.has(token)
      ) {
        continue;
      }

      diagnostics.push(
        createDiagnostic(
          node,
          filePath,
          RULE_ID,
          level,
          `Unknown design token "${token}".`,
          'Use a token declared in the design-system-guard configuration.'
        )
      );
    }
  });

  return diagnostics;
}
