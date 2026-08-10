# 設計 — AIレポート生成サーバー（WBS 5.1）

## ファイル構成

```
api/
  report.ts        ← POST /api/report （Vercel Serverless Function）
vercel.json          ← framework検出を無効化（下記理由）
.env.example
package.json          ← @anthropic-ai/sdk を追加
```

⚠️ **`vercel.json` で `"framework": null` を明示する。**
このリポジトリのpackage.jsonには`expo`依存があり、Vercelの自動検出がExpo/Web向けのビルド設定を適用してしまう可能性がある。`api/`配下の関数だけを動かしたいので、フレームワーク検出を無効化する。

## リクエスト/レスポンス契約

`POST /api/report`

```ts
// Request body
type ReportRequest = {
  steps: number | null;
  sleepMinutes: number | null;
  happiness: number | null; // 1〜5
  averageSleepMinutes: number | null; // 自分の平均（比較用）
  discovery: { kind: DiscoveryKind; fact: string } | null;
};

// Response
type ReportResponse = { report: string } | { error: string };
```

- `discovery`がnull（発見が1件も成立しない=データ蓄積前）の場合はD-6相当のフォールバック文言をサーバー側で対応する想定だが、**今回のスコープでは呼び出し側が必ずdiscoveryを渡す前提**とし、null処理は5.2/5.3の実装時に合わせる

## 認証（簡易）

⚠️ **Vercelの`api/`は既定で誰でも呼び出せる公開エンドポイントになる。**
LLM APIキー自体を守る（NFR-1-1）のとは別に、無関係な第三者がこのエンドポイントを叩いてAPIコストを消費するのを防ぐため、アプリ⇄サーバー間の共有シークレットを設ける。

- ヘッダー `x-app-secret` を必須とし、`process.env.APP_SHARED_SECRET` と一致しなければ401
- アプリ側は`.env`ではなくEAS Secretsまたはビルド時の環境変数として保持する（既存のAPIキー禁止方針と同じ扱い。詳細はアプリ側実装時に検討）
- これはLLMプロバイダのAPIキーではないため、漏洩時の被害はこのエンドポイントの悪用に限定される（シークレットのローテーションで対応可能）

## プロンプト設計

システムプロンプトに以下を固定で持つ（PRD F-3のプロンプト制約表をそのまま反映）：

- 専門用語を使わない
- 促す表現を禁止（勧誘・義務・目標提示・評価・未達の指摘）
- 良くなっている点から書き始める
- 二人称。温度は持つが人格は装わない（感情表明をしない）
- 各2〜3文、全体10文程度

ユーザーメッセージには構造化された事実のみを渡す（歩数・睡眠・幸福度・発見の素材）。事実の解釈・評価はさせない。

## モデル呼び出し

```ts
const response = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: buildFactsPrompt(body) }],
});
```

- `temperature`は指定しない（既定値のまま）
- 生成失敗（`stop_reason: "refusal"`等）はエラーとして返し、アプリ側で再試行できるようにする（PRD F-3のエラー時仕様）

## 影響範囲

- `package.json`に`@anthropic-ai/sdk`を追加（Expoアプリ本体には使わないが、リポジトリを分けない決定のため混在する）
- `docs/architecture.md`はまだ空のため今回は更新しない（別途対応）
