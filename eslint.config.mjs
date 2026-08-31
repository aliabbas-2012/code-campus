import nextConfig from 'eslint-config-next';

const config = [
  ...nextConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
    },
  },
];

export default config;
