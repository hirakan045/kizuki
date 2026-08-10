const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // 未使用変数（_ 始まりは許容）
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // 禁止用語（docs/glossary.md 参照）。プラグイン不要のコアルールなので全ファイルに適用
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Identifier[name=/^(goal|target|achievement|streak|score|recommendation|advice|suggestion)$/i]',
          message:
            '禁止用語です。docs/glossary.md を参照してください。設計原則「急かさない・責めない」に反する概念は実装しません。',
        },
      ],
    },
  },
];
