# 設計 — 生成トリガー（WBS 5.3.3）

## 変更するファイル

| ファイル                        | 種別 | 内容                                                       |
| -------------------------------- | ---- | ---------------------------------------------------------- |
| `src/logic/reportRequest.ts`     | 新規 | `GenerateReportInput`を組み立てる純粋関数                  |
| `app/(tabs)/index.tsx`           | 変更 | `load()`にレポート生成トリガーを追加                       |

`src/logic/`は副作用を持たない純粋関数の置き場（development-guidelines.md 4章）。ストレージから読んだデータを`GenerateReportInput`の形に整形する部分は計算・判定にあたるため、ここに切り出す。実際にストレージを読む（`getDays`）・APIを呼ぶ（`generateReport`）・保存する（`saveDay`）副作用は、画面の責務（functional-design.md §7）としてこれまで通り`app/(tabs)/index.tsx`に置く。

## `src/logic/reportRequest.ts`

```ts
import type { DayRecord, DiscoveryKind } from '../types';
import type { GenerateReportInput, ReportHistoryDay } from '../lib/reportApi';

type BuildReportRequestParams = {
  /** 直近30日分の日付キー（古い→新しい順、最後が対象日） */
  dateKeys: string[];
  /** dateKeysと同じ順・同じ長さの記録（未保存日は null） */
  records: (DayRecord | null)[];
  /** 対象日（今日）の歩数。画面が取得済みのライブ値を渡す */
  targetDaySteps: number | null;
  /** 対象日（今日）の睡眠時間（分）。画面が取得済みのライブ値を渡す */
  targetDaySleepMinutes: number | null;
  /** 対象日の幸福度 */
  targetDayHappiness: number;
};

export const buildReportRequest = (params: BuildReportRequestParams): GenerateReportInput => {
  const { dateKeys, records, targetDaySteps, targetDaySleepMinutes, targetDayHappiness } = params;
  const targetIndex = dateKeys.length - 1;

  const history: ReportHistoryDay[] = dateKeys.map((dateKey, i) => {
    if (i === targetIndex) {
      return { dateKey, steps: targetDaySteps, sleepMinutes: targetDaySleepMinutes };
    }
    const record = records[i];
    return {
      dateKey,
      steps: record?.steps ?? null,
      sleepMinutes: record?.sleepMinutes ?? null,
    };
  });

  // 対象日を除く直近2日分を新しい順で
  const recentDiscoveryKinds: DiscoveryKind[] = records
    .slice(0, targetIndex)
    .slice(-2)
    .reverse()
    .map((r) => r?.discoveryKind)
    .filter((k): k is DiscoveryKind => k !== undefined);

  return { history, happiness: targetDayHappiness, recentDiscoveryKinds };
};
```

`records`の長さが3未満（インストール直後など）でも`slice`は空配列を返すだけなので例外にはならない。

## `app/(tabs)/index.tsx`

### 追加するimport

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateReport } from '../../src/lib/reportApi';
import { buildReportRequest } from '../../src/logic/reportRequest';
```

### 二重生成防止のref

```ts
const generatingRef = useRef(false);
```

同一マウント中に`load()`が複数回呼ばれても（`handleSelectHappiness`後の再読み込みなど）、生成中に再度APIを叩かないためのガード。`todayRecord.report`の有無だけでは、1回目のAPI呼び出しが完了する前に2回目の`load()`が走るケースを防げないため必要。

### `load()`内、今日のレコードを読んだ後に追加

現状（`app/(tabs)/index.tsx:68-87`）:

```ts
const today = await getDay(todayKey);
setTodayRecord(today);

if (today?.happiness === undefined) {
  // ...pendingInputの設定
} else {
  setPendingInput(null);
  setInputWindowNotYetOpen(false);
}
```

変更後、else節でレポート未生成なら生成を試みる:

```ts
const today = await getDay(todayKey);
setTodayRecord(today);

if (today?.happiness === undefined) {
  // ...pendingInputの設定（変更なし）
} else {
  setPendingInput(null);
  setInputWindowNotYetOpen(false);
  if (today.report === undefined) {
    void generateAndSaveReport(todayKey, today.happiness, todaySteps, todaySleep, now);
  }
}
```

`todaySteps` / `todaySleep`は同じ`load()`内で既に取得済みのローカル変数（47-52行目）をそのまま使う。`void`で結果を待たずに画面描画を進める（`GeneratingIndicator`は`todayRecord.report === undefined`の間表示され続けるので、既存の分岐がそのまま生成中表示を担う）。

### 生成処理本体

```ts
const generateAndSaveReport = useCallback(
  async (
    targetKey: string,
    happiness: number,
    liveSteps: number | null,
    liveSleepMinutes: number | null,
    from: Date,
  ) => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    try {
      const dateKeys = getRecentDateKeys(30, from).reverse();
      const records = await getDays(dateKeys);
      const input = buildReportRequest({
        dateKeys,
        records,
        targetDaySteps: liveSteps,
        targetDaySleepMinutes: liveSleepMinutes,
        targetDayHappiness: happiness,
      });
      const result = await generateReport(input);
      const saved = await saveDay(targetKey, {
        report: result.report,
        discoveryKind: result.discoveryKind,
        generatedAt: new Date().toISOString(),
        ...(liveSteps !== null ? { steps: liveSteps } : {}),
        ...(liveSleepMinutes !== null ? { sleepMinutes: liveSleepMinutes } : {}),
      });
      setTodayRecord(saved);
    } catch (e) {
      console.error('generateAndSaveReport failed', e);
    } finally {
      generatingRef.current = false;
    }
  },
  [],
);
```

失敗時は`console.error`のみでUIには何も表示しない。`todayRecord.report`が`undefined`のままなので`GeneratingIndicator`が表示され続ける（≒回転し続けるスピナー）が、これは受け入れ条件通り「クラッシュしない」を満たすための最小対応で、エラー表示はWBS 5.3.5で扱う。次回アプリ起動時（＝`load()`再実行時）に自動的に再試行される。

## 影響範囲

- `app/day/[date].tsx`（日別詳細画面）は変更しない。生成トリガーは今日タブのみ（要求のスコープ通り）
- `docs/functional-design.md` §7 データフローの記述（「レポート生成の呼び出し」は画面の責務）と一致するため、永続的ドキュメントの更新は不要
- `docs/product-requirements.md` の記述も変更なし（F-3-1の実装がこのタスク）

## 確認方法

1. `tsc --noEmit` / ESLint
2. 実機（またはシミュレータ）で、今日の幸福度を入力 → `GeneratingIndicator`表示 → 数秒後に`ReportView`へ切り替わることを確認
3. Vercelのログ（`vercel logs`）で実際にAPIが1回だけ呼ばれていることを確認（二重生成防止の確認）
4. アプリを再起動し、レポートが再生成されず保存済みのものがそのまま表示されることを確認
