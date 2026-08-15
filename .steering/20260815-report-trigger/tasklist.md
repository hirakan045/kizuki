# タスクリスト — 生成トリガー（WBS 5.3.3）

- [ ] `src/logic/reportRequest.ts` を実装（`buildReportRequest`）
- [ ] `app/(tabs)/index.tsx` に生成トリガーを追加（`generateAndSaveReport` + `load()`からの呼び出し + 二重生成防止ref）
- [ ] 型チェック・Lint
- [ ] 実機/シミュレータで幸福度入力→レポート表示まで確認
- [ ] `vercel logs` でAPIが1回だけ呼ばれていることを確認
- [ ] アプリ再起動で再生成されないことを確認
- [ ] WBS.md 5.3.3 を更新
- [ ] PR作成
