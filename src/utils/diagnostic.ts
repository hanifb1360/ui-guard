import type {
  Diagnostic,
  RuleId,
  RuleLevel,
  Severity,
} from '../types';

import type {
  AstNode,
} from './ast';

function toSeverity(
  level: Exclude<RuleLevel, 'off'>
): Severity {
  return level === 'warn'
    ? 'warning'
    : 'error';
}

export function createDiagnostic(
  node: AstNode,
  filePath: string,
  ruleId: RuleId,
  level: Exclude<RuleLevel, 'off'>,
  message: string,
  suggestion?: string
): Diagnostic {
  const start = node.loc?.start;

  const diagnostic: Diagnostic = {
    ruleId,
    severity: toSeverity(level),
    message,
    filePath,
    line: start?.line ?? 1,
    column: (start?.column ?? 0) + 1,
  };

  if (suggestion) {
    diagnostic.suggestion = suggestion;
  }

  return diagnostic;
}
