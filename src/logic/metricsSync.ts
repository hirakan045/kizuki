import type { DayRecord } from '../types';

/**
 * 歩数・睡眠の同期が必要かを判定する。
 * 一度でも値が保存されていれば（レポート生成時のスナップショット含む）再同期しない。
 */
export const needsMetricsSync = (record: DayRecord | null): boolean => {
  console.log('[metricsSync.needsMetricsSync] start', record);
  const result = record?.steps === undefined || record?.sleepMinutes === undefined;
  console.log('[metricsSync.needsMetricsSync] end ->', result);
  return result;
};
