import {
  isAbsolute,
  relative,
  resolve,
} from 'node:path';

import {
  pathToFileURL,
} from 'node:url';

import type {
  Diagnostic,
} from './types';

export interface SarifOptions {
  cwd?: string;
  toolVersion?: string;
}

interface SarifRule {
  id: string;
  name: string;

  shortDescription: {
    text: string;
  };

  helpUri: string;

  defaultConfiguration: {
    level: 'error' | 'warning';
  };

  properties: {
    tags: string[];
  };
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: 'error' | 'warning';

  message: {
    text: string;
  };

  locations: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };

      region: {
        startLine: number;
        startColumn: number;
      };
    };
  }>;
}

interface SarifDriver {
  name: string;
  informationUri: string;
  semanticVersion?: string;
  rules: SarifRule[];
}

export interface SarifLog {
  version: '2.1.0';

  $schema:
    'https://json.schemastore.org/sarif-2.1.0.json';

  runs: Array<{
    tool: {
      driver: SarifDriver;
    };

    results: SarifResult[];
  }>;
}

const RULES: SarifRule[] = [
  {
    id: 'prefer-design-system-components',
    name: 'PreferDesignSystemComponents',

    shortDescription: {
      text:
        'Prefer configured design-system components over raw HTML elements.',
    },

    helpUri:
      'https://github.com/hanifb1360/ui-guard#prefer-design-system-components',

    defaultConfiguration: {
      level: 'error',
    },

    properties: {
      tags: [
        'design-system',
        'react',
        'maintainability',
      ],
    },
  },

  {
    id: 'no-hardcoded-colors',
    name: 'NoHardcodedColors',

    shortDescription: {
      text:
        'Avoid hardcoded colors when design tokens should be used.',
    },

    helpUri:
      'https://github.com/hanifb1360/ui-guard#no-hardcoded-colors',

    defaultConfiguration: {
      level: 'error',
    },

    properties: {
      tags: [
        'design-system',
        'design-tokens',
        'maintainability',
      ],
    },
  },

  {
    id: 'no-unknown-tokens',
    name: 'NoUnknownTokens',

    shortDescription: {
      text:
        'Only use design tokens declared by the project policy.',
    },

    helpUri:
      'https://github.com/hanifb1360/ui-guard#no-unknown-tokens',

    defaultConfiguration: {
      level: 'error',
    },

    properties: {
      tags: [
        'design-system',
        'design-tokens',
      ],
    },
  },

  {
    id: 'component-prop-policy',
    name: 'ComponentPropPolicy',

    shortDescription: {
      text:
        'Enforce configured contracts for design-system component props.',
    },

    helpUri:
      'https://github.com/hanifb1360/ui-guard#component-prop-policies',

    defaultConfiguration: {
      level: 'error',
    },

    properties: {
      tags: [
        'design-system',
        'react',
        'component-api',
        'maintainability',
      ],
    },
  },

  {
    id: 'parse-error',
    name: 'ParseError',

    shortDescription: {
      text:
        'Source code could not be parsed by ui-guard.',
    },

    helpUri:
      'https://github.com/hanifb1360/ui-guard',

    defaultConfiguration: {
      level: 'error',
    },

    properties: {
      tags: [
        'syntax',
      ],
    },
  },
];

const RULE_INDEX = new Map(
  RULES.map(
    (rule, index) => [
      rule.id,
      index,
    ]
  )
);

function toArtifactUri(
  filePath: string,
  cwd: string
): string {
  const absolutePath = isAbsolute(filePath)
    ? filePath
    : resolve(
        cwd,
        filePath
      );

  const relativePath = relative(
    cwd,
    absolutePath
  );

  if (
    relativePath
    && relativePath !== '..'
    && !relativePath.startsWith('../')
    && !relativePath.startsWith('..\\')
    && !isAbsolute(relativePath)
  ) {
    return relativePath.replace(
      /\\/g,
      '/'
    );
  }

  return pathToFileURL(
    absolutePath
  ).href;
}

export function diagnosticsToSarif(
  diagnostics: readonly Diagnostic[],
  options: SarifOptions = {}
): SarifLog {
  const cwd =
    options.cwd
    ?? process.cwd();

  const driver: SarifDriver = {
    name: 'ui-guard',

    informationUri:
      'https://github.com/hanifb1360/ui-guard',

    rules: RULES,
  };

  if (options.toolVersion) {
    driver.semanticVersion =
      options.toolVersion;
  }

  const results: SarifResult[] =
    diagnostics.map(
      diagnostic => {
        const ruleIndex =
          RULE_INDEX.get(
            diagnostic.ruleId
          );

        if (ruleIndex === undefined) {
          throw new Error(
            `No SARIF rule metadata exists for "${diagnostic.ruleId}".`
          );
        }

        const message =
          diagnostic.suggestion
            ? `${diagnostic.message} ${diagnostic.suggestion}`
            : diagnostic.message;

        return {
          ruleId:
            diagnostic.ruleId,

          ruleIndex,

          level:
            diagnostic.severity,

          message: {
            text: message,
          },

          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: toArtifactUri(
                    diagnostic.filePath,
                    cwd
                  ),
                },

                region: {
                  startLine:
                    diagnostic.line,

                  startColumn:
                    diagnostic.column,
                },
              },
            },
          ],
        };
      }
    );

  return {
    version: '2.1.0',

    $schema:
      'https://json.schemastore.org/sarif-2.1.0.json',

    runs: [
      {
        tool: {
          driver,
        },

        results,
      },
    ],
  };
}
