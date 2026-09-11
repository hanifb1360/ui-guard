import {
  mkdir,
  writeFile,
} from 'node:fs/promises';

import {
  dirname,
  relative,
  resolve,
} from 'node:path';

import {
  analyzePaths,
} from './analyzer';

import {
  loadConfig,
} from './config';

import {
  diagnosticsToSarif,
} from './sarif';

import type {
  Diagnostic,
} from './types';

function printHelp(): void {
  console.log(`
ui-guard

Usage:
  ui-guard check [paths...] [--config path] [--json] [--sarif file]
  ui-guard init
  ui-guard --help

Examples:
  ui-guard check src
  ui-guard check src app
  ui-guard check src --config ui-guard.config.mjs
  ui-guard check src --json
  ui-guard check src --sarif ui-guard.sarif
`);
}

function displayPath(
  filePath: string
): string {
  const output = relative(
    process.cwd(),
    filePath
  );

  return output || filePath;
}

function printDiagnostic(
  diagnostic: Diagnostic
): void {
  const severity =
    diagnostic.severity === 'error'
      ? 'error'
      : 'warn';

  console.log(
    `${displayPath(diagnostic.filePath)}:${diagnostic.line}:${diagnostic.column}  ${severity}  ${diagnostic.ruleId}`
  );

  console.log(
    `  ${diagnostic.message}`
  );

  if (diagnostic.suggestion) {
    console.log(
      `  Suggestion: ${diagnostic.suggestion}`
    );
  }

  console.log('');
}

async function createInitialConfig(): Promise<void> {
  const target = resolve(
    process.cwd(),
    'ui-guard.config.mjs'
  );

  const content = `/** @type {import('design-system-guard').UIGuardConfig} */
const config = {
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',

      props: {
        variant: {
          allowed: [
            'primary',
            'secondary',
            'danger',
          ],
        },

        size: {
          allowed: [
            'sm',
            'md',
            'lg',
          ],
        },
      },
    },

    input: {
      name: 'Input',
      from: '@acme/ui',
    },
  },

  // You can replace this list with tokenSources
  // pointing to CSS or JSON design-token files.
  tokens: [
    '--color-primary',
    '--color-danger',
    '--color-surface',
    '--space-sm',
    '--space-md',
  ],

  rules: {
    'component-prop-policy': 'error',
    'no-hardcoded-colors': 'error',
    'prefer-design-system-components': 'error',
    'no-unknown-tokens': 'error',
  },
};

export default config;
`;

  try {
    await writeFile(
      target,
      content,
      {
        flag: 'wx',
      }
    );
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'EEXIST'
    ) {
      throw new Error(
        'ui-guard.config.mjs already exists.'
      );
    }

    throw error;
  }

  console.log(
    'Created ui-guard.config.mjs'
  );
}

interface ParsedCheckArguments {
  paths: string[];
  configPath?: string;
  sarifPath?: string;
  json: boolean;
}

function parseCheckArguments(
  args: string[]
): ParsedCheckArguments {
  const paths: string[] = [];

  let configPath:
    | string
    | undefined;

  let sarifPath:
    | string
    | undefined;

  let json = false;

  for (
    let index = 0;
    index < args.length;
    index += 1
  ) {
    const argument = args[index];

    if (argument === '--json') {
      json = true;
      continue;
    }

    if (argument === '--config') {
      const next =
        args[index + 1];

      if (!next) {
        throw new Error(
          '--config requires a file path.'
        );
      }

      configPath = next;
      index += 1;
      continue;
    }

    if (argument === '--sarif') {
      const next =
        args[index + 1];

      if (!next) {
        throw new Error(
          '--sarif requires an output file path.'
        );
      }

      sarifPath = next;
      index += 1;
      continue;
    }

    if (
      argument
      && argument.startsWith('-')
    ) {
      throw new Error(
        `Unknown option: ${argument}`
      );
    }

    if (argument) {
      paths.push(argument);
    }
  }

  const parsed:
    ParsedCheckArguments = {
      paths:
        paths.length > 0
          ? paths
          : [
              'src',
            ],

      json,
    };

  if (configPath) {
    parsed.configPath =
      configPath;
  }

  if (sarifPath) {
    parsed.sarifPath =
      sarifPath;
  }

  return parsed;
}

async function writeSarifFile(
  outputPath: string,
  diagnostics: Diagnostic[]
): Promise<string> {
  const absoluteOutput =
    resolve(
      process.cwd(),
      outputPath
    );

  await mkdir(
    dirname(
      absoluteOutput
    ),
    {
      recursive: true,
    }
  );

  const sarif =
    diagnosticsToSarif(
      diagnostics,
      {
        cwd:
          process.cwd(),
      }
    );

  await writeFile(
    absoluteOutput,
    `${JSON.stringify(
      sarif,
      null,
      2
    )}\n`
  );

  return absoluteOutput;
}

async function runCheck(
  args: string[]
): Promise<void> {
  const parsed =
    parseCheckArguments(args);

  const config =
    await loadConfig(
      process.cwd(),
      parsed.configPath
    );

  const result =
    await analyzePaths(
      parsed.paths,
      config
    );

  let sarifOutput:
    | string
    | undefined;

  if (parsed.sarifPath) {
    sarifOutput =
      await writeSarifFile(
        parsed.sarifPath,
        result.diagnostics
      );
  }

  if (parsed.json) {
    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );
  } else {
    if (sarifOutput) {
      console.log(
        `SARIF written to ${displayPath(sarifOutput)}`
      );

      console.log('');
    }

    if (
      result.diagnostics.length
      === 0
    ) {
      console.log(
        `✓ ui-guard: no violations found in ${result.files.length} file(s).`
      );
    } else {
      for (
        const diagnostic
        of result.diagnostics
      ) {
        printDiagnostic(
          diagnostic
        );
      }

      const errors =
        result.diagnostics.filter(
          diagnostic =>
            diagnostic.severity
            === 'error'
        ).length;

      const warnings =
        result.diagnostics.filter(
          diagnostic =>
            diagnostic.severity
            === 'warning'
        ).length;

      console.log(
        `${errors} error(s), ${warnings} warning(s) in ${result.files.length} file(s).`
      );
    }
  }

  if (
    result.diagnostics.some(
      diagnostic =>
        diagnostic.severity
        === 'error'
    )
  ) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args =
    process.argv.slice(2);

  if (
    args.length === 0
    || args[0] === '--help'
    || args[0] === '-h'
    || args[0] === 'help'
  ) {
    printHelp();
    return;
  }

  const command =
    args[0];

  if (command === 'init') {
    await createInitialConfig();
    return;
  }

  if (command === 'check') {
    await runCheck(
      args.slice(1)
    );

    return;
  }

  await runCheck(args);
}

main().catch(error => {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  console.error(
    `ui-guard: ${message}`
  );

  process.exitCode = 1;
});
