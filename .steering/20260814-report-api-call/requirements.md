# 要求 — アプリからのAPI呼び出し（WBS 5.3.2）

## 背景

`api/report.ts`（5.3.1で実装済み）は、直近30日分の履歴・幸福度・直近2日の発見種類を受け取り、レポート本文と発見の種類を返す。これを呼び出すクライアント側の関数がまだない。

## やりたいこと

`src/lib/reportApi.ts` に、APIを呼び出す関数を実装する。

`development-guidelines.md` の方針どおり、`src/lib/` は外部連携（副作用あり）を担当する。データの組み立て（直近30日分をstorageから読み出す等）はこの関数の外（呼び出し側、WBS 5.3.3で実装）に置き、ここでは**リクエストを受け取ってAPIを呼ぶことに専念**する。

## 決定事項（今回相談して決めたこと）

- APIのベースURLは環境変数 `EXPO_PUBLIC_API_URL` で持つ（本番URL: `https://kizuki-api-hirakan045s-projects.vercel.app` を想定。実際のカスタムドメイン確定後に`.env`を更新する）
- `APP_SHARED_SECRET` はVercel側がSensitive設定で値を再取得できなかったため、新しい値にローテーションした。Vercel（Production/Development）とローカル`.env`の両方に同じ値を設定する
- アプリ側では `EXPO_PUBLIC_APP_SHARED_SECRET` としてビルドに埋め込む（Expoの `EXPO_PUBLIC_` プレフィックスは自動的にクライアントバンドルに埋め込まれる）

## 受け入れ条件

- [ ] `generateReport(body)` のような関数で、`history` / `happiness` / `recentDiscoveryKinds` を受け取り、APIを呼び出せる
- [ ] レスポンスの型は `{ report: string; discoveryKind: DiscoveryKind }`
- [ ] `x-app-secret` ヘッダーに `EXPO_PUBLIC_APP_SHARED_SECRET` を付与する
- [ ] HTTPエラー・ネットワークエラー時は例外を投げる（呼び出し側でのリトライ等はWBS 5.3.5の範囲、ここでは扱わない）
- [ ] `.env.example` に必要な環境変数を追記する

## 対象外（今回やらないこと）

- storageから30日分のデータを組み立てる処理（WBS 5.3.3）
- 生成トリガー・保存・エラーUI・生成中表示（WBS 5.3.3〜5.3.6）
- カスタムドメインの設定（現状の自動割当URLをそのまま使う）
