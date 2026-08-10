# 開発ガイドライン — きづき

作成日: 2026-08-08

---

## 1. ツール構成

| 用途         | ツール     | 備考                    |
| ------------ | ---------- | ----------------------- |
| Lint         | ESLint     | Expo テンプレートに同梱 |
| フォーマット | Prettier   | —                       |
| 型チェック   | TypeScript | `tsc --noEmit`          |

### セットアップ

```bash
npx expo install eslint-config-expo eslint prettier eslint-config-prettier eslint-plugin-prettier --dev
```

### コマンド

`package.json` の `scripts` に以下を定義する。

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  }
}
```

⚠️ **コード変更後は `npm run typecheck` と `npm run lint` を必ず実行する。**

---

## 2. Prettier 設定

`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

## 3. ESLint 設定

`eslint.config.js`（Flat Config）

```js
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
  },
  {
    rules: {
      // 未使用変数（_ 始まりは許容）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // 禁止用語（docs/glossary.md 参照）
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Identifier[name=/^(goal|target|achievement|streak|score|recommendation|advice|suggestion)$/i]",
          message:
            "禁止用語です。docs/glossary.md を参照してください。設計原則「急かさない・責めない」に反する概念は実装しません。",
        },
      ],
    },
  },
];
```

⚠️ **禁止用語のルールは外さないこと。**変数名が実装の発想を規定するため、用語の禁止が設計原則の防波堤になる。

---

## 4. リポジトリ構成

### 全体構造

```
kizuki/
├── CLAUDE.md                       # プロジェクトメモリ（Claude Code が起動時に読む）
├── WBS.md                          # 進捗管理の唯一の情報源
├── README.md                       # 公開用の説明
├── app.json                        # Expo 設定（plugins・権限文言）
├── eas.json                        # EAS Build 設定
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── .gitignore
│
├── app/                            # 画面（Expo Router）
├── src/                            # アプリケーションコード
├── assets/                         # 画像・アイコン
├── docs/                           # 永続的ドキュメント
└── .steering/                      # 作業単位のドキュメント
```

### `app/` — 画面

Expo Router の規約に従い、**ファイル名がそのままルートになる。**

```
app/
├── _layout.tsx                     # タブナビゲーション定義
├── index.tsx                       # 今日（ホーム）
├── history.tsx                     # 履歴
└── settings.tsx                    # 設定
```

⚠️ `app/` 配下は **default export** が必須（Expo Router の要件）。

### `src/` — アプリケーションコード

```
src/
├── components/                     # 再利用するUIコンポーネント
│   ├── HappinessInput.tsx          # 幸福度の5段階入力
│   ├── ReportView.tsx              # レポート表示
│   ├── StepsCard.tsx               # 歩数の表示
│   └── SleepCard.tsx               # 睡眠の表示
│
├── lib/                            # 外部連携
│   ├── healthkit.ts                # HealthKit のラッパー
│   └── reportApi.ts                # レポート生成APIの呼び出し
│
├── storage/                        # 永続化層
│   └── dayRecord.ts                # DayRecord の読み書き
│
├── logic/                          # ドメインロジック（副作用を持たない）
│   ├── discovery.ts                # 発見の判定（D-1〜D-6）
│   ├── statistics.ts               # 平均・偏差の計算
│   └── inputWindow.ts              # 入力可能時間帯の判定
│
├── types/                          # 型定義
│   └── index.ts                    # DayRecord, Discovery など
│
├── constants/                      # 定数
│   ├── colors.ts                   # カラーパレット
│   └── defaults.ts                 # DEFAULT_BEDTIME など
│
└── utils/                          # 汎用ユーティリティ
    └── date.ts                     # YYYY-MM-DD 変換、日跨ぎ判定
```

### 各ディレクトリの役割

| ディレクトリ      | 責務                           | 副作用                  |
| ----------------- | ------------------------------ | ----------------------- |
| `app/`            | 画面の構成とナビゲーション     | あり                    |
| `src/components/` | UIの部品。データ取得はしない   | なし（Propsで受け取る） |
| `src/lib/`        | 外部システムとの通信           | あり                    |
| `src/storage/`    | 永続化。AsyncStorage をラップ  | あり                    |
| `src/logic/`      | 計算・判定。**純粋関数で書く** | **なし**                |
| `src/types/`      | 型定義のみ                     | —                       |
| `src/constants/`  | 定数のみ                       | —                       |
| `src/utils/`      | 汎用処理                       | なし                    |

### 依存の方向

```
app/ → components/ → （Props経由でデータを受け取る）
  ↓
lib/, storage/, logic/
  ↓
types/, constants/, utils/
```

⚠️ **禁止事項**

- 画面（`app/`）から AsyncStorage や HealthKit を**直接呼ばない**。必ず `src/storage/` `src/lib/` を経由する
- `src/logic/` から `src/lib/` や `src/storage/` を呼ばない。**ロジックは純粋関数に保つ**（テスト可能性のため）
- `src/components/` の中でデータ取得をしない。Props で受け取る

### 新しいファイルの配置判断

| 作るもの               | 配置先                           |
| ---------------------- | -------------------------------- |
| 新しい画面             | `app/[名前].tsx`                 |
| 複数画面で使うUI       | `src/components/`                |
| 1画面でしか使わないUI  | その画面ファイル内に定義してよい |
| 外部APIの呼び出し      | `src/lib/`                       |
| データの保存・読み出し | `src/storage/`                   |
| 計算・判定             | `src/logic/`                     |
| 日付・文字列の変換     | `src/utils/`                     |
| 色・初期値・固定文言   | `src/constants/`                 |

### `assets/`

```
assets/
├── icon.png                        # アプリアイコン（1024x1024）
├── splash.png                      # スプラッシュ画面
└── adaptive-icon.png               # Android用（v1では未使用）
```

### `docs/` と `.steering/`

構成は `CLAUDE.md` を参照。

### `.gitignore` に必ず含めるもの

```
node_modules/
.expo/
dist/
.env
.env.local
*.p8
*.p12
*.mobileprovision
.claude/
```

⚠️ **APIキーや証明書を絶対にコミットしない。**

---

## 5. 命名規則

詳細は `docs/glossary.md` を参照。要点のみ再掲する。

| 対象                   | 規則             | 例                |
| ---------------------- | ---------------- | ----------------- |
| 変数・関数             | camelCase        | `fetchSteps`      |
| 型・コンポーネント     | PascalCase       | `DayRecord`       |
| 定数                   | UPPER_SNAKE_CASE | `DEFAULT_BEDTIME` |
| コンポーネントファイル | PascalCase       | `ReportView.tsx`  |
| その他ファイル         | camelCase        | `storage.ts`      |

⚠️ **時間・期間の変数は単位を名前に含める。**`sleepMinutes` であって `sleep` ではない。

---

## 6. TypeScript

### 基本方針

- `any` を使わない。型が不明な場合は `unknown` を使い、絞り込む
- 関数の戻り値の型は、公開する関数には明示する
- 型定義は `src/types/` に集約する（コンポーネント固有の Props は同一ファイル内で可）

### tsconfig

`strict: true` を維持する。Expo のテンプレートの初期値。

---

## 7. React / React Native

### コンポーネント

- **関数コンポーネントのみ。**クラスコンポーネントは使わない
- Props は型を定義する

```tsx
type Props = {
  value: number;
  onChange: (value: number) => void;
};

export function HappinessInput({ value, onChange }: Props) {
  // ...
}
```

### export

| 対象              | 形式                                     |
| ----------------- | ---------------------------------------- |
| `app/` 配下の画面 | **default export**（Expo Router の要件） |
| それ以外          | **named export**                         |

### スタイル

`StyleSheet.create` を使う。インラインスタイルは動的な値のみ。

```tsx
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
```

### 状態管理

v1では **React の `useState` / `useContext` のみ。**外部の状態管理ライブラリは導入しない。

---

## 8. テスト

### 対象

| 書く                               | 書かない                                 |
| ---------------------------------- | ---------------------------------------- |
| 発見の判定ロジック（`src/logic/`） | UIのスナップショット                     |
| 日付処理・タイムゾーン             | HealthKit のラッパー（外部依存が大きい） |
| ストレージ層のマージ処理           | 画面の結合テスト                         |

### 方針

v1では網羅率を追わない。**壊れたときに気づけない箇所**にだけ書く。

---

## 9. Git / GitHub 運用

### 基本方針

⚠️ **main への直接コミットは行わない。必ずブランチを切り、Pull Request を経由する。**

個人開発だが PR を挟む理由:

- GitHub 上で差分を確認できる（自分によるセルフレビュー）
- レビューの記録が残る
- 将来的に自動レビュー（Claude Code Action 等）を組み込める

### ブランチ

#### 命名

```
feature/[機能名]     # 機能追加
fix/[対象]           # バグ修正
docs/[対象]          # ドキュメントのみ
refactor/[対象]      # 内部改善
chore/[対象]         # 設定・依存関係
```

**例**

```
feature/screens
feature/ai-report
fix/step-count-duplication
docs/functional-design
```

#### 粒度

**WBS の中項目単位でブランチを切る。**タスク1つごとにPRを作ると数が多くなりすぎる。

| ブランチ               | 対応するWBS    |
| ---------------------- | -------------- |
| `feature/screens`      | 4章 画面実装   |
| `feature/ai-report`    | 5章 AIレポート |
| `feature/notification` | 6章 通知       |

### コミットメッセージ

Conventional Commits に準拠する。

```
<type>: <説明>
```

| type       | 用途                   |
| ---------- | ---------------------- |
| `feat`     | 機能追加               |
| `fix`      | バグ修正               |
| `docs`     | ドキュメントのみの変更 |
| `refactor` | 挙動を変えない内部改善 |
| `test`     | テストの追加・修正     |
| `chore`    | ビルド設定、依存関係   |

**例**

```
feat: 幸福度の入力画面を追加
fix: 歩数を統計クエリで取得するよう修正
docs: PRDに当日入力の仕様を追記
```

### 作業の流れ

```bash
# 1. ブランチを切る
git switch -c feature/screens

# 2. 実装してコミット（動く状態でコミットする）
git add -A
git commit -m "feat: タブナビゲーションを実装"

# 3. push
git push -u origin feature/screens

# 4. PR を作成
gh pr create --title "画面実装" --body "$(cat <<'EOF'
## 概要
タブ構成と今日の画面を実装

## 対応するWBS
- 4.1.1 ナビゲーション構成
- 4.2.1 今日の画面レイアウト

## 確認したこと
- 実機でタブ切り替えが動作する
- 型チェック・Lint が通る
EOF
)"

# 5. ブラウザで差分を確認
gh pr view --web

# 6. 問題なければマージ
gh pr merge --squash --delete-branch

# 7. main に戻る
git switch main
git pull
```

### GitHub CLI のセットアップ

```bash
brew install gh
gh auth login
```

未導入の場合は、`git push` 時にターミナルへ表示される URL から PR を作成する。

### PR の本文に含めるもの

| 項目         | 内容                                   |
| ------------ | -------------------------------------- |
| 概要         | 何を実装したか（1〜2行）               |
| 対応するWBS  | タスク番号                             |
| 確認したこと | 実機確認の結果、型チェック・Lintの結果 |
| 判断したこと | 設計上の選択があれば（任意）           |

💡 **「判断したこと」は DEVLOG と面接の材料になる。**迷った点があれば書き残す。

### コミットの粒度

**動く状態でコミットする。**壊れた状態を残さない。

### マージ方法

**Squash merge を使う。**PR単位で履歴が1コミットにまとまり、後から追いやすい。

⚠️ `.env` や APIキーを含むファイルを絶対にコミットしない。`.gitignore` に必ず追加する。

---

## 10. コメント

### 書くべきもの

- **なぜそうしたか**（コードを読めば分かる「何をしているか」は書かない）
- 外部仕様に起因する制約
- 一見不合理に見える処理の理由

**例**

```ts
// queryQuantitySamples の単純合計は iPhone と Watch で二重計上されるため統計クエリを使う
const result = await queryStatisticsForQuantity(...);
```

### 書かないもの

```ts
// 歩数を取得する          ← 不要
const steps = await fetchSteps();
```

---

## 11. チェックリスト（コミット前）

- [ ] `npm run typecheck` が通る
- [ ] `npm run lint` が通る
- [ ] ユーザー向け文言に禁止表現が含まれていない
- [ ] APIキー・環境変数がコミットに含まれていない
- [ ] `WBS.md` の該当タスクを更新した
