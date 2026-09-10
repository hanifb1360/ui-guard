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
  'prefer-design-system-components';

export function checkPreferDesignSystemComponents(
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
    if (node.type !== 'JSXOpeningElement') {
      return;
    }

    const nameNode = node.name;

    if (
      !isAstNode(nameNode)
      || nameNode.type !== 'JSXIdentifier'
    ) {
      return;
    }

    const tagName =
      typeof nameNode.name === 'string'
        ? nameNode.name
        : undefined;

    if (!tagName) {
      return;
    }

    const preferred =
      config.components?.[tagName];

    if (!preferred) {
      return;
    }

    diagnostics.push(
      createDiagnostic(
        node,
        filePath,
        RULE_ID,
        level,
        `Raw <${tagName}> used where a design-system component is configured.`,
        `Use <${preferred.name}> from ${preferred.from}.`
      )
    );
  });

  return diagnostics;
}
