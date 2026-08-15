/**
 * 当日分の幸福度が入力可能かを判定する（PRD F-2-3）。
 * 入力可能時間帯: 就寝予定時刻の1時間前 〜 その日の24:00まで。
 */
export function isTodayInputWindowOpen(
  now: Date,
  bedtimeHour: number,
  bedtimeMinute: number,
): boolean {
  console.log('[inputWindow.isTodayInputWindowOpen] start', { now, bedtimeHour, bedtimeMinute });
  const windowStart = new Date(now);
  windowStart.setHours(bedtimeHour, bedtimeMinute, 0, 0);
  windowStart.setMinutes(windowStart.getMinutes() - 60);

  // 就寝予定時刻が日付をまたいで設定された場合でも、
  // 窓の開始はその日のうちに収める（PRD: 評価対象は「その日」とする）
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  if (windowStart < startOfDay) {
    windowStart.setTime(startOfDay.getTime());
  }

  const result = now >= windowStart;
  console.log('[inputWindow.isTodayInputWindowOpen] end ->', result);
  return result;
}
