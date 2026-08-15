import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BEDTIME_HOUR, DEFAULT_BEDTIME_MINUTE } from '../constants/defaults';

const KEY = 'settings';

export type Settings = {
  bedtimeHour: number;
  bedtimeMinute: number;
  notificationsEnabled: boolean;
  /** HealthKitの権限リクエストを一度でも行ったか（PRD F-1-3: 完了前にデータ取得を呼ばない） */
  healthAuthRequested: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  bedtimeHour: DEFAULT_BEDTIME_HOUR,
  bedtimeMinute: DEFAULT_BEDTIME_MINUTE,
  notificationsEnabled: true,
  healthAuthRequested: false,
};

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('getSettings failed', e);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
