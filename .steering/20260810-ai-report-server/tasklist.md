# タスクリスト — AIレポート生成サーバー（WBS 5.1）

- [x] `@anthropic-ai/sdk` を導入
- [x] `api/report.ts` を実装（認証・プロンプト構築・Claude呼び出し・エラーハンドリング）
- [x] `vercel.json`（framework検出無効化）
- [x] `.env.example` 作成（`ANTHROPIC_API_KEY`, `APP_SHARED_SECRET`）
- [x] Vercel CLIでローカル起動・疎通確認（認証401・検証400・生成エラー502の3パスを確認。実キーがないため生成成功パスは未確認）
- [x] 型チェック・Lint
- [ ] ユーザー向け文言の禁止表現チェック（実際の生成結果で確認）— 実キー設定後に利用者が確認
- [x] WBS.md の 5.1.1〜5.1.3 を更新（5.1.3は実キー設定・デプロイ待ちのため⬜のまま）
- [ ] PR作成
- [ ] （利用者作業）実際のAPIキーをVercelに設定
- [ ] （利用者作業）Vercelへのデプロイ
