# 設計 — アプリからのAPI呼び出し（WBS 5.3.2）

## 変更するファイル

| ファイル                | 変更内容                                       |
| ------------------------ | ------------------------------------------------ |
| `src/lib/reportApi.ts`  | 新規。APIを呼び出す関数                          |
| `.env.example`          | `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_APP_SHARED_SECRET` を追記 |
| `.env`（ローカルのみ、gitignore対象） | 実際の値を設定                    |

## 型定義

`api/report.ts` 側の型と対応させる（DiscoveryKindは`src/types`から再利用）。

```ts
export type ReportHistoryDay = {
  dateKey: string;
  steps: number | null;
  sleepMinutes: number | null;
};

export type GenerateReportInput = {
  history: ReportHistoryDay[];
  happiness: number | null;
  recentDiscoveryKinds: DiscoveryKind[];
};

export type GenerateReportResult = {
  report: string;
  discoveryKind: DiscoveryKind;
};
```

## 関数

```ts
export async function generateReport(input: GenerateReportInput): Promise<GenerateReportResult>
```

- `fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/report`, { method: 'POST', headers: {...}, body: JSON.stringify(input) })`
- ヘッダー: `Content-Type: application/json`, `x-app-secret: process.env.EXPO_PUBLIC_APP_SHARED_SECRET`
- レスポンスが `ok` でなければ `Error` を投げる（ステータスコードをメッセージに含める）
- `healthkit.ts`と同様、named exportの async function。副作用ありなので`src/lib/`に置く

## エラーハンドリングの方針

`development-guidelines.md`の役割分担どおり、ここでは「失敗したら例外を投げる」だけに留める。リトライ・オフライン時の挙動（PRD F-3のAT-7, AT-8）はWBS 5.3.5で呼び出し側が扱う。

## 環境変数

```
# .env.example に追記
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_APP_SHARED_SECRET=
```

ExpoはSDK49以降、`EXPO_PUBLIC_`接頭辞の環境変数を追加設定なしでクライアントバンドルに埋め込む。`.env`はgitignore済み（既存の`.env*`ルールに含まれる）。

## APP_SHARED_SECRETのローテーション

Vercel側の値がSensitive設定で再取得不能だったため、新しい値を生成してVercel（Production/Development）とローカル`.env`の両方に設定する。これによりPRD/5.1.3時点の値は完全に無効化される（他に使っている箇所はない）。

## 影響範囲

- `api/.env.local`（Vercel CLIが自動生成するファイル）は今回のアプリ側`.env`とは別物。混同しないよう`.env.example`のコメントで明記する
