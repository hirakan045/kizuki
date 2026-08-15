# 要求 — 生成トリガー（WBS 5.3.3）

## 背景

`src/lib/reportApi.ts`（5.3.2で実装済み）はAPIを呼び出す関数だけを提供しており、実際にいつ呼ぶかはまだどこにも実装されていない。

`app/(tabs)/index.tsx`は既に状態遷移のうち「幸福度入力済み・レポート生成中」を見越した表示分岐（`todayRecord.report`があれば`ReportView`、なければ`GeneratingIndicator`）を持っているが、`GeneratingIndicator`を表示したまま実際にAPIを呼ぶ処理がなく行き止まりになっている。

## やりたいこと

PRD F-3-1「アプリ起動時、当日分が未生成であれば生成する」を実装する。`app/(tabs)/index.tsx`の`load()`内で、今日の記録の幸福度が入力済み・レポートが未生成の場合に`generateReport`を呼び出し、結果を保存する。

あわせて、`generateReport`が要求する3つの入力（`history` / `happiness` / `recentDiscoveryKinds`）を実際のストレージデータから組み立てる処理も、このタスクの範囲に含める（5.3.2のrequirements.mdで「対象外」としていたもの）。

## 決定事項（今回相談して決めたこと）

- トリガー場所は `app/(tabs)/index.tsx` の `load()` 内。today の `DayRecord` を読み込んだ直後、`happiness !== undefined && report === undefined` の場合にのみ生成を呼ぶ
- `history`（直近30日、古い→新しい順、最後が対象日）は `getRecentDateKeys(30, now)` → `reverse()` → `getDays()` で組み立てる。**対象日（今日）の歩数・睡眠だけは、画面が既にHealthKitから取得済みのライブ値（`steps`/`sleepMinutes` state）を使う**（today の `DayRecord` にはまだ保存されていないため）。それ以外の日は保存済みの `DayRecord.steps` / `sleepMinutes`（無ければ `null`）を使う
- `recentDiscoveryKinds`（直近2日、新しい順、0〜2件）は、今日を除く直近2日分の `DayRecord.discoveryKind` から組み立てる
- 生成成功時は `report` / `discoveryKind` / `generatedAt`（ISO 8601） に加え、対象日の `steps` / `sleepMinutes` のスナップショットも `saveDay` で保存する（`DayRecord`の型コメント通り、表示値とレポート本文の食い違いを防ぐため）
- 同一マウント中の二重呼び出しを防ぐため、生成中フラグ（ref）で簡易的にガードする
- 失敗時はエラーを握りつぶし、`report`を保存しない（次回起動時に再試行される）。エラー表示・リトライUIはWBS 5.3.5の範囲とし、今回は扱わない

## 受け入れ条件

- [ ] 今日の記録が「幸福度入力済み・レポート未生成」のとき、アプリ起動時（今日タブのマウント時）に自動でレポート生成APIが呼ばれる
- [ ] `history` / `happiness` / `recentDiscoveryKinds` が正しい形式・順序で組み立てられる
- [ ] 生成成功時、結果が `saveDay` で保存され、画面が `GeneratingIndicator` から `ReportView` に切り替わる
- [ ] 同一マウント中に複数回APIが呼ばれない
- [ ] 生成失敗時、アプリがクラッシュせず、`GeneratingIndicator` が表示され続ける（エラーUI自体は次タスク）
- [ ] 自分のデバイスで実際に幸福度を入力し、レポートが表示されることを確認する

## 対象外（今回やらないこと）

- エラー表示・リトライボタン（WBS 5.3.5）
- 生成中表示の改善（WBS 5.3.6、既存の`GeneratingIndicator`をそのまま使う）
- 再生成の厳密な抑止（WBS 5.3.4。今回のガードはあくまで同一マウント内の二重呼び出し防止のみ）
- 日別詳細画面（`app/day/[date].tsx`）での生成トリガー・当日中に生成できなかった場合の翌日以降の再試行（PRD F-3の該当部分、別スコープ）
- プロンプト調整（WBS 5.3.7）
