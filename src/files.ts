import {
  readdir,
  stat,
} from 'node:fs/promises';

import {
  extname,
  resolve,
} from 'node:path';

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.mts',
]);

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
]);

async function collect(
  target: string,
  files: string[]
): Promise<void> {
  const information = await stat(target);

  if (information.isFile()) {
    if (
      SOURCE_EXTENSIONS.has(
        extname(target)
      )
    ) {
      files.push(target);
    }

    return;
  }

  if (!information.isDirectory()) {
    return;
  }

  const entries = await readdir(
    target,
    {
      withFileTypes: true,
    }
  );

  for (const entry of entries) {
    if (
      entry.isDirectory()
      && IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    await collect(
      resolve(target, entry.name),
      files
    );
  }
}

export async function collectSourceFiles(
  inputPaths: string[],
  cwd = process.cwd()
): Promise<string[]> {
  const files: string[] = [];

  for (const inputPath of inputPaths) {
    await collect(
      resolve(cwd, inputPath),
      files
    );
  }

  return [
    ...new Set(files),
  ].sort();
}
