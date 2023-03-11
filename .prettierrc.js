module.exports = {
  $schema: 'https://json.schemastore.org/prettierrc',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  endOfLine: 'lf',
  bracketSpacing: false,
  arrowParens: 'always',
  proseWrap: 'always',
  quoteProps: 'as-needed',
  htmlWhitespaceSensitivity: 'ignore',
  jsxSingleQuote: true,
  overrides: [
    {
      files: ['*.md', '*.yml'],
      options: {
        tabWidth: 4,
      },
    },
    {
      files: ['tsconfig.*', 'tslint.json'],
      options: {
        printWidth: 20,
      },
    },
  ],
};
