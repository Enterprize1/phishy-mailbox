module.exports = {
  extends: ['airbnb/hooks', 'prettier'],
  plugins: ['react', 'import', '@typescript-eslint', 'prettier', 'eslint-plugin-jsx-a11y'],
  env: {
    browser: true,
    es6: true,
  },
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'], // Your TypeScript files extension
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'airbnb-typescript',
        'prettier',
      ],
      parserOptions: {
        project: './tsconfig.json', // Specify it only for TypeScript files
        tsconfigRootDir: __dirname,
      },
      rules: {
        'react/jsx-curly-brace-presence': ['error', {props: 'never', children: 'never'}],
        'react/jsx-props-no-spreading': 'off',
        // We enforce button types through TypeScript
        'react/button-has-type': 'off',
        // The rule doesn't work with TypeScript and FC: https://github.com/yannickcr/eslint-plugin-react/issues/2777
        'react/prop-types': 'off',
        'react/require-default-props': ['error', {forbidDefaultForRequired: false, ignoreFunctionalComponents: true}],
        'import/prefer-default-export': 'off',
        'import/no-extraneous-dependencies': 'off',
        'no-underscore-dangle': ['error', {allow: ['__id', '__typename']}],
        // This conflicts with generated files in the Lint job in the CI and does not provide any benefit for us
        'import/extensions': 'off',
        '@typescript-eslint/no-namespace': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
  },
  settings: {
    react: {
      version: '18.2.0',
    },
  },
};
