# タスクリスト — UI修正4点（割り込みタスク）

利用者からの指示に基づく独立したUI修正4点。詳細仕様は利用者の指示メッセージを参照。

## 1. 幸福度アイコンを絵文字からMaterialCommunityIconsに変更

- [x] `src/constants/happiness.ts` にアイコン名・色の配列を定義
- [x] `src/components/HappinessInput.tsx` を絵文字からアイコン表示に変更
- [x] 履歴（`DayListItem`）・日別詳細画面の幸福度表示も同じ定数を参照するよう変更
- [x] 型チェック・Lint
- 副産物: `@expo/vector-icons`がこのプロジェクトには未インストールだったため、`npx expo install @expo/vector-icons`で追加した（利用者の前提「Expoに標準搭載」は今回の構成では成立しなかった）

## 2. 履歴一覧にヘッダー行を追加

- [x] `DayListItem` の列幅定義を確認・`DAY_LIST_COLUMN_WIDTHS`として共有定数化
- [x] `src/components/DayListHeader.tsx` を新規作成し、`app/(tabs)/history.tsx` の `ListHeaderComponent` に設定（列名: 日付・歩数・睡眠・幸福度）
- [x] 型チェック・Lint
- 備考: 幸福度列の幅は元の18pxではアイコンしか収まらず「幸福度」の文字が入らないため28pxに調整（ヘッダー・データ行の両方に反映、整列は維持）

## 3. レポート内の睡眠時間表記を「◯h◯m」形式に変更

- [x] `src/utils/format.ts` に `formatSleepDuration(minutes: number): string` を実装（既存の`formatSleepMinutes`を置き換え）
- [x] `SleepDisplay`・`DayListItem`・`app/day/[date].tsx` の分単位表示箇所をすべてこの関数経由に統一
- [x] `sleepMinutes` の保存形式・HealthKit取得ロジックは変更していない
- [x] 型チェック・Lint
- 備考: `ReportView`はAIが生成した自由記述テキストをそのまま表示するだけで、クライアント側で睡眠時間を数値からフォーマットしている箇所ではないため変更なし（睡眠時間の文言はサーバー側のプロンプト生成時点で決まる）

## 4. 日別詳細画面の戻るボタンをタブ風から通常の戻るボタンに修正

- [x] 原因特定: `app/_layout.tsx`のルートStackで`(tabs)`のStack.Screenに`title`が設定されておらず、戻るボタンのラベルがルート名「(tabs)」にフォールバックしていた
- [x] `app/day/[date].tsx`のStack.Screenに`headerBackTitle: ''`を追加（ラベルを表示せず矢印のみにする）
- [x] 同じ原因で`app/settings.tsx`の戻るボタンも「(tabs)」になるはずだったため、`app/_layout.tsx`の`settings`のStack.Screenにも同様に追加
- [x] 型チェック・Lint
- [ ] 実機で「レポート/日別詳細 → 履歴」の遷移を確認（利用者側で確認予定）

## 共通

- [x] WBS.mdに4章の新規タスク行を追加（4.5.1〜4.5.4、作業前）
- [ ] 全4点完了後、WBS.mdに実績時間を記録
- [ ] コミット・PR作成
