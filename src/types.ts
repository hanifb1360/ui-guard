export type RuleLevel =
  | 'off'
  | 'warn'
  | 'error';

export type Severity =
  | 'warning'
  | 'error';

export type RuleId =
  | 'component-prop-policy'
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

export type ComponentPropValue =
  | string
  | number
  | boolean
  | null;

export interface ComponentPropPolicy {
  /**
   * Static values accepted for this prop.
   *
   * Dynamic expressions are intentionally not rejected
   * because design-system-guard cannot know their runtime value.
   */
  allowed?: ComponentPropValue[];

  /**
   * Require the prop to be present.
   */
  required?: boolean;

  /**
   * Reject the prop completely.
   */
  forbidden?: boolean;

  /**
   * Report use of the prop as deprecated.
   */
  deprecated?: boolean;

  /**
   * Suggested replacement for a forbidden or
   * deprecated prop.
   */
  replacement?: string;
}

export interface DesignSystemComponent {
  name: string;
  from: string;

  props?: Record<
    string,
    ComponentPropPolicy
  >;
}

export interface RuleConfiguration {
  'component-prop-policy'?: RuleLevel;
  'no-hardcoded-colors'?: RuleLevel;
  'prefer-design-system-components'?: RuleLevel;
  'no-unknown-tokens'?: RuleLevel;
}

export interface DesignSystemGuardConfig {
  components?: Record<
    string,
    DesignSystemComponent
  >;

  /**
   * Tokens declared directly in configuration.
   */
  tokens?: string[];

  /**
   * CSS or JSON files from which design-system-guard should discover
   * design tokens.
   *
   * Paths are resolved relative to the design-system-guard config file
   * when loaded through loadConfig().
   */
  tokenSources?: TokenSourceInput[];

  rules?: RuleConfiguration;
}

/**
 * @deprecated Use DesignSystemGuardConfig instead.
 */
export type UIGuardConfig =
  DesignSystemGuardConfig;

export interface Diagnostic {
  ruleId:
    | RuleId
    | 'parse-error';

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
  config?: DesignSystemGuardConfig;
}

export interface AnalyzeResult {
  files: string[];
  diagnostics: Diagnostic[];
}
