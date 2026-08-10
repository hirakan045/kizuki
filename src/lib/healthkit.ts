// src/lib/healthkit.ts
import HealthKit, {
  isHealthDataAvailable,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";

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
const isAppleWatch = (sample: {
  sourceRevision?: { source?: { bundleIdentifier?: string } };
}) =>
  sample.sourceRevision?.source?.bundleIdentifier?.startsWith(
    "com.apple.health",
  ) ?? false;

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

  const samples = await HealthKit.queryCategorySamples(
    "HKCategoryTypeIdentifierSleepAnalysis",
    { limit: 0, filter: { date: { startDate: start, endDate: end } } },
  );

  // 複数ソースが同一時間帯を重複記録するため、Apple Watch に限定する
  const watchSamples = samples.filter(isAppleWatch);
  const target: readonly (typeof samples)[number][] =
    watchSamples.length > 0 ? watchSamples : dedupeBySource(samples);

  if (target.length === 0) return null;

  const totalMs = target
    .filter((s) => ASLEEP_VALUES.includes(s.value))
    .reduce((sum, s) => {
      const from = new Date(s.startDate).getTime();
      const to = new Date(s.endDate).getTime();
      return sum + (to - from);
    }, 0);

  return Math.round(totalMs / 60000);
}

/** Apple Watch が無い場合、サンプル数が最も多いソース1つに絞る */
function dedupeBySource<
  T extends { sourceRevision?: { source?: { bundleIdentifier?: string } } },
>(samples: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const s of samples) {
    const id = s.sourceRevision?.source?.bundleIdentifier ?? "unknown";
    groups.set(id, [...(groups.get(id) ?? []), s]);
  }
  let largest: T[] = [];
  for (const group of groups.values()) {
    if (group.length > largest.length) largest = group;
  }
  return largest;
}

// 歩数（統計クエリ = iPhone と Watch の重複を HealthKit 側で排除）
export const fetchSteps = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const result = await HealthKit.queryStatisticsForQuantity(
      "HKQuantityTypeIdentifierStepCount",
      ["cumulativeSum"],
      {
        filter: {
          date: { startDate: startOfDay, endDate: now },
        },
      },
    );

    console.log("歩数の統計:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("歩数取得失敗", e);
  }
};

// 睡眠（Category 型なので別関数）
export const fetchSleep = async () => {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const samples = await HealthKit.queryCategorySamples(
      "HKCategoryTypeIdentifierSleepAnalysis",
      {
        limit: 0,
        filter: {
          date: { startDate: yesterday, endDate: now },
        },
      },
    );

    console.log("睡眠サンプル数:", samples.length);
    console.log("睡眠データ:", JSON.stringify(samples, null, 2));
  } catch (e) {
    console.error("睡眠取得失敗", e);
  }
};
