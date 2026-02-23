module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['standard'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {},
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'standard-with-typescript',
        'plugin:@typescript-eslint/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
      },
    },
    {
      files: ['*.d.ts'],
      extends: ['standard-with-typescript'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '*.config.js'],
};
