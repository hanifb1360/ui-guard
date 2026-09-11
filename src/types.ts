export type RuleLevel =
  | 'off'
  | 'warn'
  | 'error';

export type Severity =
  | 'warning'
  | 'error';

export type RuleId =
  | 'no-hardcoded-colors'
  | 'prefer-design-system-components'
  | 'no-unknown-tokens';

export type TokenSourceFormat =
  | 'css'
  | 'json';

export interface TokenSource {
  path: string;
  format?: TokenSourceFormat;
}

export type TokenSourceInput =
  | string
  | TokenSource;

export interface DesignSystemComponent {
  name: string;
  from: string;
}

export interface RuleConfiguration {
  'no-hardcoded-colors'?: RuleLevel;
  'prefer-design-system-components'?: RuleLevel;
  'no-unknown-tokens'?: RuleLevel;
}

export interface UIGuardConfig {
  components?: Record<string, DesignSystemComponent>;

  /**
   * Tokens declared directly in configuration.
   */
  tokens?: string[];

  /**
   * CSS or JSON files from which ui-guard should discover
   * design tokens.
   *
   * Paths are resolved relative to the ui-guard config file
   * when loaded through loadConfig().
   */
  tokenSources?: TokenSourceInput[];

  rules?: RuleConfiguration;
}

export interface Diagnostic {
  ruleId: RuleId | 'parse-error';
  severity: Severity;
  message: string;
  filePath: string;
  line: number;
  column: number;
  suggestion?: string;
}

export interface AnalyzeSourceInput {
  filePath: string;
  source: string;
  config?: UIGuardConfig;
}

export interface AnalyzeResult {
  files: string[];
  diagnostics: Diagnostic[];
}
