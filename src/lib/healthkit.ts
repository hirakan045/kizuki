// src/lib/healthkit.ts
import HealthKit, {
  isHealthDataAvailable,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

export const checkHealthDataAvailable = (): boolean => isHealthDataAvailable();

/** 権限リクエスト完了後にデータ取得を実行すること（PRD F-1-3。認証前に呼ぶとクラッシュする） */
export async function requestHealthAuthorization(): Promise<boolean> {
  return requestAuthorization({
    toRead: ['HKQuantityTypeIdentifierStepCount', 'HKCategoryTypeIdentifierSleepAnalysis'],
  });
}

/**
 * HKCategoryValueSleepAnalysis の値。
 * Apple Watch はステージ別に細分化して記録する。
 */
const SleepStage = {
  inBed: 0,
  asleepUnspecified: 1,
  awake: 2,
  asleepCore: 3,
  asleepDeep: 4,
  asleepREM: 5,
} as const;

/**
 * 睡眠時間に含めるステージ。
 * inBed（就床）と awake（覚醒）は除外する。
 * ベッドにいた時間と実際に眠っていた時間は別物であり、
 * 含めると睡眠時間が過大になるため。
 */
const ASLEEP_VALUES: number[] = [
  SleepStage.asleepUnspecified,
  SleepStage.asleepCore,
  SleepStage.asleepDeep,
  SleepStage.asleepREM,
];

/** Apple Watch のソースかを判定する */
const isAppleWatch = (sample: { sourceRevision?: { source?: { bundleIdentifier?: string } } }) =>
  sample.sourceRevision?.source?.bundleIdentifier?.startsWith('com.apple.health') ?? false;

/**
 * 指定日の睡眠時間（分）を取得する。
 * 睡眠は日をまたぐため、前日18:00〜当日12:00 の範囲で取得する。
 */
export async function fetchSleepMinutes(date: Date): Promise<number | null> {
  const start = new Date(date);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);

  const end = new Date(date);
  end.setHours(12, 0, 0, 0);

  const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
    limit: 0,
    filter: { date: { startDate: start, endDate: end } },
  });

  // 複数ソースが同一時間帯を重複記録するため、Apple Watch に限定する
  const watchSamples = samples.filter(isAppleWatch);
  const usableSamples: readonly (typeof samples)[number][] =
    watchSamples.length > 0 ? watchSamples : dedupeBySource(samples);

  if (usableSamples.length === 0) return null;

  const totalMs = usableSamples
    .filter((s) => ASLEEP_VALUES.includes(s.value))
    .reduce((sum, s) => {
      const from = new Date(s.startDate).getTime();
      const to = new Date(s.endDate).getTime();
      return sum + (to - from);
    }, 0);

  return Math.round(totalMs / 60000);
}

/** Apple Watch が無い場合、サンプル数が最も多いソース1つに絞る */
function dedupeBySource<T extends { sourceRevision?: { source?: { bundleIdentifier?: string } } }>(
  samples: readonly T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const s of samples) {
    const id = s.sourceRevision?.source?.bundleIdentifier ?? 'unknown';
    groups.set(id, [...(groups.get(id) ?? []), s]);
  }
  let largest: T[] = [];
  for (const group of groups.values()) {
    if (group.length > largest.length) largest = group;
  }
  return largest;
}

/**
 * 指定日の歩数を取得する。
 * 統計クエリ（cumulativeSum）を使う。単純合計は iPhone と Watch の
 * 重複記録で二重計上されるため使わない（PRD F-1-1）。
 */
export async function fetchStepsCount(date: Date): Promise<number | null> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await HealthKit.queryStatisticsForQuantity(
    'HKQuantityTypeIdentifierStepCount',
    ['cumulativeSum'],
    { filter: { date: { startDate: startOfDay, endDate: endOfDay } } },
  );

  const quantity = result.sumQuantity?.quantity;
  return quantity !== undefined ? Math.round(quantity) : null;
}
