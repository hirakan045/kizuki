# タスクリスト — 過去日のレポート生成（WBS 5.3.8, 5.3.9）

- [x] `src/logic/metricsSync.ts` を実装（`needsMetricsSync`）
- [x] `src/utils/date.ts` に `isWithinRecentWindow` を追加
- [x] `src/hooks/useReportGeneration.ts` を実装（`generateAndSaveReport` を共通化）
- [x] `app/(tabs)/index.tsx`: `load()` に直近30日分（今日を除く）の歩数・睡眠同期を追加
- [x] `app/(tabs)/index.tsx`: ローカルの生成処理を `useReportGeneration` フック利用に置き換え
- [x] `app/day/[date].tsx`: `load()` に生成トリガー（幸福度入力済み・レポート未生成・直近30日以内）を追加
- [x] `app/day/[date].tsx`: `handleSelectHappiness` を `load()` 呼び出しのみに整理
- [x] `app/day/[date].tsx`: `GeneratingIndicator` の表示分岐を追加
- [x] `src/types/index.ts`: `DayRecord` のコメント更新
- [x] `docs/product-requirements.md`: F-3-7 を追加
- [x] `docs/development-guidelines.md`: `src/hooks/` を構成表・配置判断表に追加
- [x] 型チェック・Lint
- [x] 実機: 過去日で幸福度入力→レポート生成される一連の流れを確認（デバッグ過程で複数回確認）
- [ ] 実機: 31日以上前の未生成日で生成もインジケータも出ないことを確認（未検証。`isWithinRecentWindow`のロジックレビューのみ）
- [x] `vercel logs` でAPIが日ごとに1回だけ呼ばれていることを確認（デバッグ過程で確認、二重呼び出しは発生していない）
- [x] アプリ再起動で直近30日分の `steps`/`sleepMinutes` が同期されることを確認
- [x] WBS.md 5.3.8, 5.3.9 を更新（状態・実績時間）
- [x] PR作成

## 副産物（この作業中に見つかり対応した不具合）

- 履歴タブがタブ再訪問時に再読み込みされない問題 → `useFocusEffect`化で修正
- `AsyncStorage`読み込みのラグ → アプリ内メモリキャッシュを追加
- `api/report.ts`: `discoveryKind: dataAccumulation`選択時にClaudeが構造化出力を崩し502になる問題 → サーバー側で壊れた出力を検出・修復するロジックを追加、本番デプロイ済み
