import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayRecord } from '../types';

const KEY_PREFIX = 'day:';

const buildKey = (dateKey: string): string => `${KEY_PREFIX}${dateKey}`;

/**
 * アプリ内メモリキャッシュ。
 * タブを行き来するたびにAsyncStorageへ読みに行くと体感できるラグが出るため、
 * 一度読んだ・書いた日はここから即座に返す（起動中のみ有効、再起動でクリアされる）。
 */
const cache = new Map<string, DayRecord | null>();

/**
 * 指定日の記録を取得する。存在しなければ null。
 */
export const getDay = async (dateKey: string): Promise<DayRecord | null> => {
  if (cache.has(dateKey)) return cache.get(dateKey) ?? null;
  try {
    const raw = await AsyncStorage.getItem(buildKey(dateKey));
    const result = raw ? (JSON.parse(raw) as DayRecord) : null;
    cache.set(dateKey, result);
    return result;
  } catch (e) {
    console.error('getDay failed', dateKey, e);
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
  try {
    const current = (await getDay(dateKey)) ?? {};
    const merged: DayRecord = { ...current, ...patch };
    await AsyncStorage.setItem(buildKey(dateKey), JSON.stringify(merged));
    cache.set(dateKey, merged);
    return merged;
  } catch (e) {
    console.error('saveDay failed', dateKey, e);
    return null;
  }
};

/**
 * 指定日の記録を完全に削除する（テスト用。プロンプト調整時の再生成に使う）。
 */
export const clearDay = async (dateKey: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(buildKey(dateKey));
    cache.delete(dateKey);
  } catch (e) {
    console.error('clearDay failed', dateKey, e);
  }
};

/**
 * 複数日の記録をまとめて取得する。
 * 存在しない日は null が入る（引数の順序と対応する）。
 */
export const getDays = async (dateKeys: string[]): Promise<(DayRecord | null)[]> => {
  const missingKeys = dateKeys.filter((k) => !cache.has(k));
  if (missingKeys.length > 0) {
    try {
      const pairs = await AsyncStorage.multiGet(missingKeys.map(buildKey));
      pairs.forEach(([, raw], i) => {
        cache.set(missingKeys[i], raw ? (JSON.parse(raw) as DayRecord) : null);
      });
    } catch (e) {
      console.error('getDays failed', e);
      return dateKeys.map(() => null);
    }
  }
  return dateKeys.map((k) => cache.get(k) ?? null);
};
