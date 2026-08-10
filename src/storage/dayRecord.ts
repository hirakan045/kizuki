import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DayRecord } from "../types";

const KEY_PREFIX = "day:";

const buildKey = (dateKey: string): string => `${KEY_PREFIX}${dateKey}`;

/**
 * 指定日の記録を取得する。存在しなければ null。
 */
export const getDay = async (dateKey: string): Promise<DayRecord | null> => {
  try {
    const raw = await AsyncStorage.getItem(buildKey(dateKey));
    return raw ? (JSON.parse(raw) as DayRecord) : null;
  } catch (e) {
    console.error("getDay failed", dateKey, e);
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
    return merged;
  } catch (e) {
    console.error("saveDay failed", dateKey, e);
    return null;
  }
};

/**
 * 複数日の記録をまとめて取得する。
 * 存在しない日は null が入る（引数の順序と対応する）。
 */
export const getDays = async (
  dateKeys: string[],
): Promise<(DayRecord | null)[]> => {
  try {
    const pairs = await AsyncStorage.multiGet(dateKeys.map(buildKey));
    return pairs.map(([, raw]) =>
      raw ? (JSON.parse(raw) as DayRecord) : null,
    );
  } catch (e) {
    console.error("getDays failed", e);
    return dateKeys.map(() => null);
  }
};
