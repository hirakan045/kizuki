# タスクリスト — 生成トリガー（WBS 5.3.3）

- [x] `src/logic/reportRequest.ts` を実装（`buildReportRequest`）
- [x] `app/(tabs)/index.tsx` に生成トリガーを追加（`generateAndSaveReport` + `load()`からの呼び出し + 二重生成防止ref）
- [x] 型チェック・Lint
- [x] 実機/シミュレータで幸福度入力→レポート表示まで確認
- [x] `vercel logs` でAPIが1回だけ呼ばれていることを確認（デバッグ過程で繰り返し確認、二重呼び出しは発生していない）
- [x] アプリ再起動で再生成されないことを確認（`report`保存済みの日は`load()`のガードで再呼び出しされない設計・動作を確認）
- [x] WBS.md 5.3.3 を更新
- [x] PR作成（5.3.8・5.3.9とまとめて作成）
