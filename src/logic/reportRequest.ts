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
