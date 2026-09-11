export {
  analyzeFile,
  analyzePaths,
  analyzeSource,
} from './analyzer';

export {
  defineConfig,
  getRuleLevel,
  loadConfig,
  normalizeConfig,
  resolveConfig,
} from './config';

export {
  collectSourceFiles,
} from './files';

export {
  diagnosticsToSarif,
} from './sarif';

export {
  extractCssCustomProperties,
  extractJsonDesignTokens,
  loadTokenSource,
  loadTokenSources,
} from './tokens';

export type {
  SarifLog,
  SarifOptions,
} from './sarif';

export type {
  AnalyzeResult,
  AnalyzeSourceInput,
  DesignSystemComponent,
  Diagnostic,
  RuleConfiguration,
  RuleId,
  RuleLevel,
  Severity,
  TokenSource,
  TokenSourceFormat,
  TokenSourceInput,
  UIGuardConfig,
} from './types';
