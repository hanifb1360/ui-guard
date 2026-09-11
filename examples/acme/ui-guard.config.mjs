const config = {
  components: {
    button: {
      name: 'Button',
      from: '@acme/ui',
    },

    input: {
      name: 'Input',
      from: '@acme/ui',
    },
  },

  tokenSources: [
    './tokens.css',
  ],

  rules: {
    'no-hardcoded-colors': 'error',
    'prefer-design-system-components': 'error',
    'no-unknown-tokens': 'error',
  },
};

export default config;
