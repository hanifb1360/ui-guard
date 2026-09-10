import {
  getRuleLevel,
} from '../config';

import type {
  Diagnostic,
  UIGuardConfig,
} from '../types';

import {
  isAstNode,
  walkAst,
  type AstNode,
} from '../utils/ast';

import {
  createDiagnostic,
} from '../utils/diagnostic';

const RULE_ID =
  'no-hardcoded-colors';

const COLOR_PATTERN =
  /(?:#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\s*\()/i;

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

export function checkNoHardcodedColors(
  ast: AstNode,
  filePath: string,
  config: UIGuardConfig
): Diagnostic[] {
  const level = getRuleLevel(
    config,
    RULE_ID
  );

  if (level === 'off') {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  walkAst(ast, node => {
    if (node.type !== 'JSXAttribute') {
      return;
    }

    const nameNode = node.name;

    if (
      !isAstNode(nameNode)
      || nameNode.type !== 'JSXIdentifier'
      || nameNode.name !== 'style'
    ) {
      return;
    }

    const valueNode = node.value;

    if (!isAstNode(valueNode)) {
      return;
    }

    walkAst(valueNode, child => {
      const text = getLiteralText(child);

      if (
        !text
        || !COLOR_PATTERN.test(text)
      ) {
        return;
      }

      diagnostics.push(
        createDiagnostic(
          child,
          filePath,
          RULE_ID,
          level,
          `Hardcoded color "${text}" found in a JSX style property.`,
          'Use an approved design token instead of a literal color value.'
        )
      );
    });
  });

  return diagnostics;
}
