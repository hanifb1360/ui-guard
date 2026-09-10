import {
  readFile,
} from 'node:fs/promises';

import {
  parse,
  type ParserOptions,
} from '@babel/parser';

import {
  normalizeConfig,
} from './config';

import {
  collectSourceFiles,
} from './files';

import {
  checkNoHardcodedColors,
} from './rules/noHardcodedColors';

import {
  checkNoUnknownTokens,
} from './rules/noUnknownTokens';

import {
  checkPreferDesignSystemComponents,
} from './rules/preferDesignSystemComponents';

import type {
  AnalyzeResult,
  AnalyzeSourceInput,
  Diagnostic,
  UIGuardConfig,
} from './types';

import type {
  AstNode,
} from './utils/ast';

const PARSER_OPTIONS: ParserOptions = {
  sourceType: 'unambiguous',
  plugins: [
    'typescript',
    'jsx',
    'decorators-legacy',
  ],
};

function parseErrorDiagnostic(
  filePath: string,
  error: unknown
): Diagnostic {
  let line = 1;
  let column = 1;
  let message = 'Unable to parse source file.';

  if (
    error
    && typeof error === 'object'
  ) {
    if (
      'message' in error
      && typeof error.message === 'string'
    ) {
      message = error.message;
    }

    if (
      'loc' in error
      && error.loc
      && typeof error.loc === 'object'
    ) {
      const location = error.loc as {
        line?: unknown;
        column?: unknown;
      };

      if (
        typeof location.line === 'number'
      ) {
        line = location.line;
      }

      if (
        typeof location.column === 'number'
      ) {
        column = location.column + 1;
      }
    }
  }

  return {
    ruleId: 'parse-error',
    severity: 'error',
    message,
    filePath,
    line,
    column,
  };
}

export function analyzeSource(
  input: AnalyzeSourceInput
): Diagnostic[] {
  const config = normalizeConfig(
    input.config
  );

  let ast: AstNode;

  try {
    ast = parse(
      input.source,
      {
        ...PARSER_OPTIONS,
        sourceFilename: input.filePath,
      }
    ) as unknown as AstNode;
  } catch (error) {
    return [
      parseErrorDiagnostic(
        input.filePath,
        error
      ),
    ];
  }

  const diagnostics = [
    ...checkPreferDesignSystemComponents(
      ast,
      input.filePath,
      config
    ),

    ...checkNoHardcodedColors(
      ast,
      input.filePath,
      config
    ),

    ...checkNoUnknownTokens(
      ast,
      input.filePath,
      config
    ),
  ];

  return diagnostics.sort(
    (left, right) =>
      left.line - right.line
      || left.column - right.column
      || left.ruleId.localeCompare(
        right.ruleId
      )
  );
}

export async function analyzeFile(
  filePath: string,
  config: UIGuardConfig
): Promise<Diagnostic[]> {
  const source = await readFile(
    filePath,
    'utf8'
  );

  return analyzeSource({
    filePath,
    source,
    config,
  });
}

export async function analyzePaths(
  inputPaths: string[],
  config: UIGuardConfig,
  cwd = process.cwd()
): Promise<AnalyzeResult> {
  const files = await collectSourceFiles(
    inputPaths,
    cwd
  );

  const diagnostics: Diagnostic[] = [];

  for (const filePath of files) {
    diagnostics.push(
      ...(await analyzeFile(
        filePath,
        config
      ))
    );
  }

  diagnostics.sort(
    (left, right) =>
      left.filePath.localeCompare(
        right.filePath
      )
      || left.line - right.line
      || left.column - right.column
  );

  return {
    files,
    diagnostics,
  };
}
