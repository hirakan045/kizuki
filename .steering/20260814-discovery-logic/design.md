# 設計 — 発見（D-1〜D-6）のAI判断化

## 変更するファイル

| ファイル                | 変更内容                                                              |
| ------------------------ | ----------------------------------------------------------------------- |
| `api/report.ts`          | リクエスト形式を30日分履歴に変更。システムプロンプトに発見の判断基準を追加。構造化出力（tool use）でreportとdiscoveryKindを分離取得 |
| `src/types/index.ts`     | `DayRecord`に`discoveryKind?: DiscoveryKind`を追加（3日連続回避のため保存する） |
| `docs/product-requirements.md` | F-3-5の記述をAI判断方式に更新。D-5の閾値を緩和 |

## リクエスト形式

```ts
type HistoryDay = { dateKey: string; steps: number | null; sleepMinutes: number | null };

type ReportRequestBody = {
  history: HistoryDay[]; // 直近30日分、古い→新しい順。最後の要素が対象日（昨日）
  happiness: number | null; // 対象日の幸福度
  recentDiscoveryKinds: DiscoveryKind[]; // 直近2日分の発見種類（新しい順、0〜2件）
};
```

`averageSleepMinutes`は廃止（Claudeがhistoryから自分で平均を出せるため）。

## レスポンス形式（構造化出力）

自由文からdiscoveryKindを後付けで抜き出すと誤判定・パース失敗のリスクがあるため、**Anthropic APIのtool use（強制呼び出し）**で構造化する。

```ts
const REPORT_TOOL = {
  name: 'submit_report',
  description: 'レポート本文と、今回使用した発見の種類を提出する',
  input_schema: {
    type: 'object',
    properties: {
      report: { type: 'string' },
      discoveryKind: {
        type: 'string',
        enum: ['personalBest', 'deviationFromAverage', 'correlation', 'weekdayPattern', 'weeklyChange', 'dataAccumulation'],
      },
    },
    required: ['report', 'discoveryKind'],
  },
};
// messages.create({ tools: [REPORT_TOOL], tool_choice: { type: 'tool', name: 'submit_report' }, ... })
```

レスポンスは `{ report: string; discoveryKind: DiscoveryKind }`。

## システムプロンプトに追加する内容

既存の制約（専門用語禁止、促す表現禁止、二人称、段落構成など）はそのまま維持し、以下を追加する。

### 発見の判断基準（D-1〜D-6）

| 種類 | 成立条件 |
| --- | --- |
| D-1 過去最高 | 直近30日で歩数・睡眠のいずれかが最大 |
| D-2 平均との差 | 平均から標準偏差1つ分以上離れている |
| D-3 連動 | 直近7日で歩数と睡眠/幸福度に同方向の変化がある |
| D-4 曜日の傾向 | 同一曜日のデータが3件以上ある |
| D-5 週次の変化 | 前週・今週それぞれ**7日中5日以上**データがあれば、両週の平均を比較する |
| D-6 データ蓄積の予告 | 上記いずれも成立しない場合のフォールバック |

⚠️ D-5の閾値は当初PRD案の「データ14日以上（＝欠損なし）」だと厳しすぎるため、**各週5日以上のデータがあれば計算可**に緩和する（今回の相談で決定）。

### 事実グラウンディングの制約

- `history`に含まれる実際の数値のみを根拠にする。存在しない数値・誇張した表現を作らない
- 複数の種類が同時に成立する場合は、直近の`recentDiscoveryKinds`に含まれない種類を優先する
- 全ての候補が`recentDiscoveryKinds`と重複する場合、またはどれも成立しない場合はD-6にフォールバックする

## DayRecordの変更

```ts
export type DayRecord = {
  // ...既存フィールド
  /** その日のレポートで使われた発見の種類 */
  discoveryKind?: DiscoveryKind;
};
```

保存処理自体（API呼び出し後に`discoveryKind`を書き込む部分）はWBS 5.3.2/5.3.4で実装する。今回は型定義とAPIのレスポンスまで。

## エラーハンドリング

- `tool_choice`で強制しているため、通常は`tool_use`ブロックが返る
- `tool_use`が無い、または`discoveryKind`が enum 外の場合は502（既存の異常系ハンドリングを流用）

## PRD更新方針（F-3-5）

「アプリ側で以下の種類から...選び、AIに素材として渡す」の記述を、「AIが直近30日分の生データから種類を選び、事実に基づいて記述する。アプリは直近2日分の発見種類を渡し、3日連続の重複を避けさせる」という趣旨に書き換える。D-5の閾値表記も上記の緩和内容に合わせる。

具体的な文面は承認後にPRDへ反映する。

## 影響範囲

- WBS 5.2.1〜5.2.7（アプリ側判定ロジックの個別タスク）はこの方針転換により不要になる。❌にし、備考に理由を記録する
- 新たに5.3.1（プロンプト作成）の範囲に発見判断ロジックが含まれることになるため、5.3.1の記述を更新する
