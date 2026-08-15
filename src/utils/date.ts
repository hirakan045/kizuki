/**
 * Date を YYYY-MM-DD 形式の文字列に変換する。
 *
 * toISOString() は UTC に変換するため使わない。
 * 日本時間の 09:00 未満が前日になってしまうため、
 * ローカル時刻から年月日を取り出して組み立てる。
 */
export const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * YYYY-MM-DD 形式の文字列を Date に変換する。
 * 時刻はローカル時刻の 00:00:00 になる。
 */
export const fromDateKey = (key: string): Date => {
  console.log('[date.fromDateKey] start', key);
  const [y, m, d] = key.split('-').map(Number);
  const result = new Date(y, m - 1, d);
  console.log('[date.fromDateKey] end', key, '->', result.toDateString());
  return result;
};

/**
 * 直近 days 日分の日付キーを新しい順で返す。
 * @param days 取得する日数
 * @param from 基準日（省略時は今日）
 */
export const getRecentDateKeys = (days: number, from: Date = new Date()): string[] => {
  console.log('[date.getRecentDateKeys] start', { days, from: from.toDateString() });
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    keys.push(toDateKey(d));
  }
  console.log('[date.getRecentDateKeys] end', keys);
  return keys;
};

/**
 * 2つの Date が同じ日かを判定する。
 */
export const isSameDay = (a: Date, b: Date): boolean => toDateKey(a) === toDateKey(b);

/**
 * 対象日が、基準日から直近 days 日以内（対象日を含む）かを判定する。
 */
export const isWithinRecentWindow = (
  dateKey: string,
  days: number,
  now: Date = new Date(),
): boolean => {
  console.log('[date.isWithinRecentWindow] start', { dateKey, days });
  const result = getRecentDateKeys(days, now).includes(dateKey);
  console.log('[date.isWithinRecentWindow] end', dateKey, '->', result);
  return result;
};
