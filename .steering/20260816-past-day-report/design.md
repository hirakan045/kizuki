# 設計 — 過去日のレポート生成（WBS 5.3.8, 5.3.9）

## 変更するファイル

| ファイル                              | 種別 | 内容                                                             |
| -------------------------------------- | ---- | ---------------------------------------------------------------- |
| `src/logic/metricsSync.ts`             | 新規 | `needsMetricsSync`（同期が必要かの純粋判定）                     |
| `src/utils/date.ts`                    | 変更 | `isWithinRecentWindow`（対象日が直近N日以内かの判定）を追加      |
| `src/hooks/useReportGeneration.ts`     | 新規 | `generateAndSaveReport`＋二重生成防止refを画面間で共通化するフック |
| `app/(tabs)/index.tsx`                 | 変更 | `load()`に直近30日分の歩数・睡眠同期を追加。生成処理をフック利用に置き換え |
| `app/day/[date].tsx`                   | 変更 | 生成トリガー（幸福度入力時／画面を開いたとき）を追加。フック利用 |
| `src/types/index.ts`                   | 変更 | `DayRecord`のコメント更新（steps/sleepMinutesの意味変化）        |
| `docs/development-guidelines.md`       | 変更 | リポジトリ構成表に`src/hooks/`を追加（4章）                      |
| `docs/product-requirements.md`         | 変更 | F-3にF-3-7を追加                                                  |

`src/hooks/`は現行の development-guidelines.md 4章の構成表に存在しないディレクトリ。5.3.3のdesign.mdでは「生成処理は画面の責務」としてapp/(tabs)/index.tsx内に閉じていたが、今回は今日タブ・日別詳細画面の2箇所で同じ処理（対象日を渡して生成・保存する）が必要になるため、単純にコピーすると重複が生じる。`src/logic/`は副作用禁止のため置けず、`src/lib/`は外部システム通信専用のため一連のオーケストレーション（storage読み取り→API呼び出し→storage保存）を置く場所として不適切。React標準の「複数画面で使う状態＋副作用はカスタムフックに切り出す」を採用し、新設する。

## `src/logic/metricsSync.ts`

```ts
import type { DayRecord } from '../types';

/**
 * 歩数・睡眠の同期が必要かを判定する。
 * 一度でも値が保存されていれば（レポート生成時のスナップショット含む）再同期しない。
 */
export const needsMetricsSync = (record: DayRecord | null): boolean =>
  record?.steps === undefined || record?.sleepMinutes === undefined;
```

## `src/utils/date.ts` に追加

```ts
/**
 * 対象日が、基準日から直近 days 日以内（対象日を含む）かを判定する。
 */
export const isWithinRecentWindow = (dateKey: string, days: number, now: Date = new Date()): boolean =>
  getRecentDateKeys(days, now).includes(dateKey);
```

## `src/hooks/useReportGeneration.ts`

```ts
import { useCallback, useRef } from 'react';
import { generateReport } from '../lib/reportApi';
import { getDays, saveDay } from '../storage/dayRecord';
import { getRecentDateKeys } from '../utils/date';
import { buildReportRequest } from '../logic/reportRequest';
import type { DayRecord } from '../types';

export function useReportGeneration() {
  const generatingRef = useRef(false);

  const generateAndSaveReport = useCallback(
    async (
      targetKey: string,
      happiness: number,
      targetSteps: number | null,
      targetSleepMinutes: number | null,
      from: Date,
    ): Promise<DayRecord | null> => {
      if (generatingRef.current) return null;
      generatingRef.current = true;
      try {
        const dateKeys = getRecentDateKeys(30, from).reverse();
        const records = await getDays(dateKeys);
        const input = buildReportRequest({
          dateKeys,
          records,
          targetDaySteps: targetSteps,
          targetDaySleepMinutes: targetSleepMinutes,
          targetDayHappiness: happiness,
        });
        const result = await generateReport(input);
        return await saveDay(targetKey, {
          report: result.report,
          discoveryKind: result.discoveryKind,
          generatedAt: new Date().toISOString(),
          ...(targetSteps !== null ? { steps: targetSteps } : {}),
          ...(targetSleepMinutes !== null ? { sleepMinutes: targetSleepMinutes } : {}),
        });
      } catch (e) {
        console.error('generateAndSaveReport failed', targetKey, e);
        return null;
      } finally {
        generatingRef.current = false;
      }
    },
    [],
  );

  return { generateAndSaveReport };
}
```

今日タブ・日別詳細画面はそれぞれ独立してこのフックを呼ぶ（＝`generatingRef`はコンポーネントインスタンスごとに別物）。同時に生成しうる対象日は画面ごとに異なる（今日タブ＝今日、日別詳細＝開いている過去日）ため、画面をまたいだ二重生成の衝突は実質起こらない。同一画面内での二重呼び出し（`load()`の多重発火など）だけを防げれば十分。

## `app/(tabs)/index.tsx`

### 追加するimport

```ts
import { needsMetricsSync } from '../../src/logic/metricsSync';
import { useReportGeneration } from '../../src/hooks/useReportGeneration';
```

`generateAndSaveReport`のローカル実装・`generatingRef`は削除し、`const { generateAndSaveReport } = useReportGeneration();`に置き換える。呼び出し側のコードは変更なし（引数の順序・意味を維持）。

### `load()`に追加する同期処理

`today`を読み込む直前、直近30日分（今日を除く）のうち`needsMetricsSync`が`true`の日だけHealthKitから取得して保存する。

```ts
const syncKeys = getRecentDateKeys(30, now).slice(1); // 今日を除く（今日はこの後ライブ値を使う）
const syncRecords = await getDays(syncKeys);
await Promise.all(
  syncKeys.map(async (key, i) => {
    if (!needsMetricsSync(syncRecords[i])) return;
    const dayDate = fromDateKey(key);
    const [daySteps, daySleep] = await Promise.all([fetchStepsCount(dayDate), fetchSleepMinutes(dayDate)]);
    if (daySteps !== null || daySleep !== null) {
      await saveDay(key, {
        ...(daySteps !== null ? { steps: daySteps } : {}),
        ...(daySleep !== null ? { sleepMinutes: daySleep } : {}),
      });
    }
  }),
);
```

`getRecentDateKeys(30, now)`は新しい順（先頭が今日）なので`.slice(1)`で今日を除いた29日分になる。既存のtodayの歩数・睡眠取得（`fetchStepsCount(now)`等）と並列で走らせて構わないため、`Promise.all`にまとめて追加する（`todaySteps`/`todaySleep`取得と同時に実行）。

この処理は`today`のレコード読み込みより前、`load()`の早い段階（`recentKeys`の判定より前）に置く。前日入力待ちで早期returnするケース（102-107行目）でも同期自体は済ませておきたいため。

## `app/day/[date].tsx`

今日タブと同じ生成トリガーのパターンを、対象日を`date`パラメータに変えて追加する。

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { isWithinRecentWindow } from '../../src/utils/date';
import { useReportGeneration } from '../../src/hooks/useReportGeneration';
import { GeneratingIndicator } from '../../src/components/GeneratingIndicator';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [record, setRecord] = useState<DayRecord | null>(null);
  const { generateAndSaveReport } = useReportGeneration();

  const load = useCallback(async () => {
    if (!date) return;
    const current = await getDay(date);
    setRecord(current);

    if (
      current?.happiness !== undefined &&
      current.report === undefined &&
      isWithinRecentWindow(date, 30)
    ) {
      const saved = await generateAndSaveReport(
        date,
        current.happiness,
        current.steps ?? null,
        current.sleepMinutes ?? null,
        fromDateKey(date),
      );
      if (saved) setRecord(saved);
    }
  }, [date, generateAndSaveReport]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectHappiness = async (value: HappinessLevel) => {
    if (!date) return;
    await saveDay(date, { happiness: value });
    await load(); // 保存直後にload()が再実行され、上のif分岐が生成をトリガーする
  };

  // ...

  {record?.report ? (
    <ReportView report={record.report} />
  ) : (
    record?.happiness !== undefined && isWithinRecentWindow(date, 30) && <GeneratingIndicator />
  )}
```

- `handleSelectHappiness`に生成呼び出しを直接書かず、`load()`の再実行に委ねる。今日タブと同じ「`happiness`あり・`report`なし」判定を`load()`側に一本化することで、「その場で入力したとき」と「入力済みの日を後から開いたとき」を同じコードパスで扱える（要求のとおり）
- `current.steps ?? null` / `current.sleepMinutes ?? null`: 過去日はライブ取得しない。`index.tsx`の同期処理（5.3.8）で埋まっている前提。埋まっていなければ`null`のまま生成し、AI側は「睡眠データなし」として扱う（F-3のエラー時仕様と同じ扱い）
- `isWithinRecentWindow(date, 30)`が`false`（31日以上前）の場合は生成せず、`GeneratingIndicator`も出さない。レポートが無い旨は既存の「何も表示しない」ままとする（追加のメッセージ表示は今回のスコープ外）

## `src/types/index.ts` のコメント更新

```diff
- * 歩数・睡眠時間は HealthKit が保持しているが、
- * レポート生成時点の値を保存しておく。
- * HealthKit のデータは Watch の遅延同期などで後から書き換わるため、
- * レポート本文と表示値が食い違うのを防ぐ。
+ * 歩数・睡眠時間は HealthKit が保持しているが、アプリ側にも保存する。
+ * レポート未生成の日は起動時に同期される（直近30日分、5.3.8）。
+ * レポート生成後は値を固定し、以降は上書きしない。
+ * HealthKit のデータは Watch の遅延同期などで後から書き換わるため、
+ * レポート本文と表示値が食い違うのを防ぐ。
```

## `docs/product-requirements.md` への追加（F-3）

```diff
  | F-3-6 | 生成済みレポートは保存し、再生成しない           | Must   |
+ | F-3-7 | 日別詳細画面を開いたとき、対象日（直近30日以内）の幸福度が入力済みでレポートが未生成なら生成する | Should |
```

F-3-1の直後にある「設計判断」に類する短い注記も追加する:

> **F-3-7の設計判断**: 対象を直近30日以内に限るのは、レポート生成に使う`history`（直近30日分の歩数・睡眠）がその範囲でしか同期されないため（5.3.8）。それより古い日は歩数・睡眠のコンテキストが揃わず、レポート精度が落ちる。

## `docs/development-guidelines.md` への追加（4章）

構成表・配置判断表に1行追加する:

```diff
  | `src/logic/`      | 計算・判定。**純粋関数で書く** | **なし**                |
+ | `src/hooks/`      | 複数画面で使う状態・副作用のカスタムフック | あり（内部でlib/storageを呼ぶ） |
  | `src/types/`      | 型定義のみ                     | —                       |
```

```diff
  | 計算・判定             | `src/logic/`                     |
+ | 複数画面で使う状態＋副作用 | `src/hooks/`                   |
```

## 影響範囲

- `src/lib/reportApi.ts`・`src/logic/reportRequest.ts`は変更なし（そのまま再利用）
- 4.3.3（折れ線グラフ）・4.3.4（過去レポートの閲覧、実装済み）には影響しない
- WBS 5.3.4（レポートの保存・再生成の抑止）は本タスクと関係するが別スコープのまま（同一日内の再生成抑止＝`report`の有無チェックは既に両画面に入っている）

## 確認方法

1. `tsc --noEmit` / ESLint
2. 実機: 幸福度だけ記録済みでレポートが無い過去日（履歴タブ→日別詳細）を開き、`GeneratingIndicator`→`ReportView`と切り替わることを確認
3. 実機: 未入力の過去日を開き、幸福度を入力→レポートが生成されることを確認
4. `vercel logs`で、開いた日ごとに1回だけAPIが呼ばれていることを確認
5. アプリを再起動し、直近30日分の`DayRecord`に`steps`/`sleepMinutes`が同期されていること（`GeneratingIndicator`用に確認しやすい過去日で）を確認
6. 31日以上前の未生成日を開いても、生成もインジケータ表示もされないことを確認
