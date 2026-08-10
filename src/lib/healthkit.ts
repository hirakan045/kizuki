// src/lib/healthkit.ts
import HealthKit, {
  isHealthDataAvailable,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";

/** 睡眠時間に含めるステージ（inBed=0, awake=2 は除外） */
const ASLEEP_VALUES = [1, 3, 4, 5];

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
