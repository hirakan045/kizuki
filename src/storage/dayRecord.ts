import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayRecord } from '../types';

const KEY_PREFIX = 'day:';

const buildKey = (dateKey: string): string => `${KEY_PREFIX}${dateKey}`;

/**
 * 指定日の記録を取得する。存在しなければ null。
 */
export const getDay = async (dateKey: string): Promise<DayRecord | null> => {
  console.log('[dayRecord.getDay] start', dateKey);
  try {
    const raw = await AsyncStorage.getItem(buildKey(dateKey));
    const result = raw ? (JSON.parse(raw) as DayRecord) : null;
    console.log('[dayRecord.getDay] end', dateKey, '->', result);
    return result;
  } catch (e) {
    console.error('getDay failed', dateKey, e);
    console.log('[dayRecord.getDay] end (error)', dateKey);
    return null;
  }
};

/**
 * 指定日の記録を保存する。
 * 既存のレコードとマージするため、部分的な更新ができる。
 * （幸福度だけ先に入力し、後からレポートを追記する流れがあるため）
 */
export const saveDay = async (
  dateKey: string,
  patch: Partial<DayRecord>,
): Promise<DayRecord | null> => {
  console.log('[dayRecord.saveDay] start', dateKey, patch);
  try {
    const current = (await getDay(dateKey)) ?? {};
    const merged: DayRecord = { ...current, ...patch };
    await AsyncStorage.setItem(buildKey(dateKey), JSON.stringify(merged));
    console.log('[dayRecord.saveDay] end', dateKey, '->', merged);
    return merged;
  } catch (e) {
    console.error('saveDay failed', dateKey, e);
    console.log('[dayRecord.saveDay] end (error)', dateKey);
    return null;
  }
};

/**
 * 複数日の記録をまとめて取得する。
 * 存在しない日は null が入る（引数の順序と対応する）。
 */
export const getDays = async (dateKeys: string[]): Promise<(DayRecord | null)[]> => {
  console.log('[dayRecord.getDays] start', dateKeys);
  try {
    const pairs = await AsyncStorage.multiGet(dateKeys.map(buildKey));
    const result = pairs.map(([, raw]) => (raw ? (JSON.parse(raw) as DayRecord) : null));
    console.log('[dayRecord.getDays] end', result);
    return result;
  } catch (e) {
    console.error('getDays failed', e);
    console.log('[dayRecord.getDays] end (error)');
    return dateKeys.map(() => null);
  }
};
