export interface AstPosition {
  line: number;
  column: number;
}

export interface AstLocation {
  start: AstPosition;
  end: AstPosition;
}

export interface AstNode {
  type: string;
  loc?: AstLocation | null;
  [key: string]: unknown;
}

export function isAstNode(
  value: unknown
): value is AstNode {
  return Boolean(
    value
      && typeof value === 'object'
      && 'type' in value
      && typeof (value as { type?: unknown }).type === 'string'
  );
}

export function walkAst(
  root: AstNode,
  visit: (node: AstNode) => void
): void {
  const seen = new Set<object>();

  function walk(node: AstNode): void {
    if (seen.has(node)) {
      return;
    }

    seen.add(node);
    visit(node);

    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'loc'
        || key === 'start'
        || key === 'end'
        || key === 'extra'
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (isAstNode(item)) {
            walk(item);
          }
        }

        continue;
      }

      if (isAstNode(value)) {
        walk(value);
      }
    }
  }

  walk(root);
}
