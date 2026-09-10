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
} from './config';

export {
  collectSourceFiles,
} from './files';

export type {
  AnalyzeResult,
  AnalyzeSourceInput,
  DesignSystemComponent,
  Diagnostic,
  RuleConfiguration,
  RuleId,
  RuleLevel,
  Severity,
  UIGuardConfig,
} from './types';
