import {
  getRuleLevel,
} from '../config';

import type {
  ComponentPropPolicy,
  ComponentPropValue,
  DesignSystemComponent,
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
  'component-prop-policy';

interface KnownStaticValue {
  known: true;
  value: ComponentPropValue;
}

interface UnknownStaticValue {
  known: false;
}

type StaticValue =
  | KnownStaticValue
  | UnknownStaticValue;

function getIdentifierName(
  value: unknown
): string | undefined {
  if (
    !isAstNode(value)
    || value.type !== 'Identifier'
    || typeof value.name !== 'string'
  ) {
    return undefined;
  }

  return value.name;
}

function getJsxIdentifierName(
  value: unknown
): string | undefined {
  if (
    !isAstNode(value)
    || value.type !== 'JSXIdentifier'
    || typeof value.name !== 'string'
  ) {
    return undefined;
  }

  return value.name;
}

function getImportSource(
  node: AstNode
): string | undefined {
  const source =
    node.source;

  if (
    !isAstNode(source)
    || source.type !== 'StringLiteral'
    || typeof source.value !== 'string'
  ) {
    return undefined;
  }

  return source.value;
}

function getImportedName(
  specifier: AstNode
): string | undefined {
  const imported =
    specifier.imported;

  if (!isAstNode(imported)) {
    return undefined;
  }

  if (
    imported.type === 'Identifier'
    && typeof imported.name === 'string'
  ) {
    return imported.name;
  }

  if (
    imported.type === 'StringLiteral'
    && typeof imported.value === 'string'
  ) {
    return imported.value;
  }

  return undefined;
}

function formatValue(
  value: ComponentPropValue
): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatAllowedValues(
  values: readonly ComponentPropValue[]
): string {
  return values
    .map(formatValue)
    .join(', ');
}

function getStaticExpressionValue(
  expression: AstNode
): StaticValue {
  if (
    expression.type === 'StringLiteral'
    && typeof expression.value === 'string'
  ) {
    return {
      known: true,
      value: expression.value,
    };
  }

  if (
    expression.type === 'NumericLiteral'
    && typeof expression.value === 'number'
  ) {
    return {
      known: true,
      value: expression.value,
    };
  }

  if (
    expression.type === 'BooleanLiteral'
    && typeof expression.value === 'boolean'
  ) {
    return {
      known: true,
      value: expression.value,
    };
  }

  if (expression.type === 'NullLiteral') {
    return {
      known: true,
      value: null,
    };
  }

  if (
    expression.type === 'UnaryExpression'
    && expression.operator === '-'
    && isAstNode(expression.argument)
    && expression.argument.type
      === 'NumericLiteral'
    && typeof expression.argument.value
      === 'number'
  ) {
    return {
      known: true,
      value:
        -expression.argument.value,
    };
  }

  if (
    expression.type === 'TemplateLiteral'
  ) {
    const expressions =
      Array.isArray(
        expression.expressions
      )
        ? expression.expressions
        : [];

    const quasis =
      Array.isArray(
        expression.quasis
      )
        ? expression.quasis
        : [];

    if (
      expressions.length === 0
      && quasis.length === 1
      && isAstNode(quasis[0])
    ) {
      const value =
        quasis[0].value;

      if (
        value
        && typeof value === 'object'
      ) {
        const cooked =
          'cooked' in value
            ? value.cooked
            : undefined;

        const raw =
          'raw' in value
            ? value.raw
            : undefined;

        if (typeof cooked === 'string') {
          return {
            known: true,
            value: cooked,
          };
        }

        if (typeof raw === 'string') {
          return {
            known: true,
            value: raw,
          };
        }
      }
    }
  }

  return {
    known: false,
  };
}

function getStaticAttributeValue(
  attribute: AstNode
): StaticValue {
  const value =
    attribute.value;

  if (value == null) {
    return {
      known: true,
      value: true,
    };
  }

  if (!isAstNode(value)) {
    return {
      known: false,
    };
  }

  if (
    value.type === 'StringLiteral'
    && typeof value.value === 'string'
  ) {
    return {
      known: true,
      value: value.value,
    };
  }

  if (
    value.type
      === 'JSXExpressionContainer'
    && isAstNode(value.expression)
  ) {
    return getStaticExpressionValue(
      value.expression
    );
  }

  return {
    known: false,
  };
}

function isAllowedValue(
  value: ComponentPropValue,
  allowed: readonly ComponentPropValue[]
): boolean {
  return allowed.some(
    candidate =>
      Object.is(
        candidate,
        value
      )
  );
}

function replacementSuggestion(
  componentName: string,
  propName: string,
  policy: ComponentPropPolicy
): string {
  if (policy.replacement) {
    return `Use "${policy.replacement}" instead.`;
  }

  return `Remove "${propName}" from <${componentName}>.`;
}

function buildConfiguredComponents(
  config: UIGuardConfig
): Map<
  string,
  Map<string, DesignSystemComponent>
> {
  const bySource =
    new Map<
      string,
      Map<
        string,
        DesignSystemComponent
      >
    >();

  for (
    const component
    of Object.values(
      config.components ?? {}
    )
  ) {
    if (
      !component.props
      || Object.keys(
        component.props
      ).length === 0
    ) {
      continue;
    }

    let byName =
      bySource.get(
        component.from
      );

    if (!byName) {
      byName =
        new Map<
          string,
          DesignSystemComponent
        >();

      bySource.set(
        component.from,
        byName
      );
    }

    byName.set(
      component.name,
      component
    );
  }

  return bySource;
}

function collectLocalComponents(
  ast: AstNode,
  configured:
    Map<
      string,
      Map<
        string,
        DesignSystemComponent
      >
    >
): Map<
  string,
  DesignSystemComponent
> {
  const localComponents =
    new Map<
      string,
      DesignSystemComponent
    >();

  walkAst(
    ast,
    node => {
      if (
        node.type
        !== 'ImportDeclaration'
      ) {
        return;
      }

      const source =
        getImportSource(node);

      if (!source) {
        return;
      }

      const byName =
        configured.get(source);

      if (!byName) {
        return;
      }

      const specifiers =
        Array.isArray(
          node.specifiers
        )
          ? node.specifiers
          : [];

      for (
        const rawSpecifier
        of specifiers
      ) {
        if (
          !isAstNode(
            rawSpecifier
          )
        ) {
          continue;
        }

        const localName =
          getIdentifierName(
            rawSpecifier.local
          );

        if (!localName) {
          continue;
        }

        if (
          rawSpecifier.type
          === 'ImportSpecifier'
        ) {
          const importedName =
            getImportedName(
              rawSpecifier
            );

          if (!importedName) {
            continue;
          }

          const component =
            byName.get(
              importedName
            );

          if (component) {
            localComponents.set(
              localName,
              component
            );
          }

          continue;
        }

        if (
          rawSpecifier.type
          === 'ImportDefaultSpecifier'
        ) {
          const component =
            byName.get(
              localName
            );

          if (component) {
            localComponents.set(
              localName,
              component
            );
          }
        }
      }
    }
  );

  return localComponents;
}

function collectAttributes(
  openingElement: AstNode
): Map<string, AstNode> {
  const attributes =
    new Map<string, AstNode>();

  const rawAttributes =
    Array.isArray(
      openingElement.attributes
    )
      ? openingElement.attributes
      : [];

  for (
    const rawAttribute
    of rawAttributes
  ) {
    if (
      !isAstNode(
        rawAttribute
      )
      || rawAttribute.type
        !== 'JSXAttribute'
    ) {
      continue;
    }

    const name =
      getJsxIdentifierName(
        rawAttribute.name
      );

    if (!name) {
      continue;
    }

    attributes.set(
      name,
      rawAttribute
    );
  }

  return attributes;
}

export function checkComponentPropPolicy(
  ast: AstNode,
  filePath: string,
  config: UIGuardConfig
): Diagnostic[] {
  const level =
    getRuleLevel(
      config,
      RULE_ID
    );

  if (level === 'off') {
    return [];
  }

  const configured =
    buildConfiguredComponents(
      config
    );

  if (configured.size === 0) {
    return [];
  }

  const localComponents =
    collectLocalComponents(
      ast,
      configured
    );

  if (
    localComponents.size
    === 0
  ) {
    return [];
  }

  const diagnostics:
    Diagnostic[] = [];

  walkAst(
    ast,
    node => {
      if (
        node.type
        !== 'JSXOpeningElement'
      ) {
        return;
      }

      const localName =
        getJsxIdentifierName(
          node.name
        );

      if (!localName) {
        return;
      }

      const component =
        localComponents.get(
          localName
        );

      if (
        !component
        || !component.props
      ) {
        return;
      }

      const attributes =
        collectAttributes(node);

      for (
        const [
          propName,
          policy,
        ]
        of Object.entries(
          component.props
        )
      ) {
        const attribute =
          attributes.get(
            propName
          );

        if (!attribute) {
          if (policy.required) {
            diagnostics.push(
              createDiagnostic(
                node,
                filePath,
                RULE_ID,
                level,
                `<${component.name}> requires prop "${propName}".`,
                `Add "${propName}" to <${component.name}>.`
              )
            );
          }

          continue;
        }

        if (policy.forbidden) {
          diagnostics.push(
            createDiagnostic(
              attribute,
              filePath,
              RULE_ID,
              level,
              `Prop "${propName}" is forbidden on <${component.name}>.`,
              replacementSuggestion(
                component.name,
                propName,
                policy
              )
            )
          );

          continue;
        }

        if (policy.deprecated) {
          diagnostics.push(
            createDiagnostic(
              attribute,
              filePath,
              RULE_ID,
              level,
              `Prop "${propName}" is deprecated on <${component.name}>.`,
              replacementSuggestion(
                component.name,
                propName,
                policy
              )
            )
          );

          continue;
        }

        const allowed =
          policy.allowed;

        if (
          !allowed
          || allowed.length === 0
        ) {
          continue;
        }

        const staticValue =
          getStaticAttributeValue(
            attribute
          );

        if (!staticValue.known) {
          continue;
        }

        if (
          isAllowedValue(
            staticValue.value,
            allowed
          )
        ) {
          continue;
        }

        diagnostics.push(
          createDiagnostic(
            attribute,
            filePath,
            RULE_ID,
            level,
            `<${component.name}> prop "${propName}" received ${formatValue(staticValue.value)}, which is not allowed.`,
            `Allowed values: ${formatAllowedValues(allowed)}.`
          )
        );
      }
    }
  );

  return diagnostics;
}
