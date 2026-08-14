# タスクリスト — 発見（D-1〜D-6）のAI判断化（WBS 5.3.1の一部）

- [x] `src/types/index.ts` に `DayRecord.discoveryKind?: DiscoveryKind` を追加
- [x] `api/report.ts` のリクエスト型を `history` / `recentDiscoveryKinds` ベースに変更
- [x] システムプロンプトにD-1〜D-6の定義・D-5の緩和した閾値・事実グラウンディングの制約・D-6文言の区別を追加
- [x] `submit_report` tool を定義し、`tool_choice`で強制。レスポンスを `{ report, discoveryKind }` に変更
- [x] 異常系（tool_useが無い／discoveryKindがenum外）のハンドリング
- [x] 型チェック・Lint
- [x] ユーザー向け文言の禁止表現チェック（システムプロンプトの例文・指示文に禁止表現が紛れていないか）
- [x] WBS.md 5.3.1 を更新
- [x] PR作成
