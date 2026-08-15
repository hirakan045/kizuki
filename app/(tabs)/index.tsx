import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  checkHealthDataAvailable,
  fetchSleepMinutes,
  fetchStepsCount,
  requestHealthAuthorization,
} from '../../src/lib/healthkit';
import { getDay, getDays, saveDay } from '../../src/storage/dayRecord';
import { getSettings, saveSettings, type Settings } from '../../src/storage/settings';
import { fromDateKey, getRecentDateKeys, toDateKey } from '../../src/utils/date';
import { isTodayInputWindowOpen } from '../../src/logic/inputWindow';
import { needsMetricsSync } from '../../src/logic/metricsSync';
import { useReportGeneration } from '../../src/hooks/useReportGeneration';
import { StepsDisplay } from '../../src/components/StepsDisplay';
import { SleepDisplay } from '../../src/components/SleepDisplay';
import { HappinessInput } from '../../src/components/HappinessInput';
import { GeneratingIndicator } from '../../src/components/GeneratingIndicator';
import { ReportView } from '../../src/components/ReportView';
import { colors } from '../../src/constants/colors';
import type { DayRecord, HappinessLevel } from '../../src/types';

type PendingInput = { dateKey: string; question: string } | null;

export default function TodayScreen() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [pendingInput, setPendingInput] = useState<PendingInput>(null);
  const [inputWindowNotYetOpen, setInputWindowNotYetOpen] = useState(false);
  const { generateAndSaveReport } = useReportGeneration();

  const load = useCallback(async () => {
    const isAvailable = checkHealthDataAvailable();
    setAvailable(isAvailable);
    if (!isAvailable) return;

    const currentSettings = await getSettings();
    setSettings(currentSettings);
    if (!currentSettings.healthAuthRequested) return;

    const now = new Date();
    const todayKey = toDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    // 今日を除く直近30日分の歩数・睡眠を同期する（レポート未生成の日のみ、5.3.8）
    const syncKeys = getRecentDateKeys(30, now).slice(1);
    const [todaySteps, todaySleep, syncRecords] = await Promise.all([
      fetchStepsCount(now),
      fetchSleepMinutes(now),
      getDays(syncKeys),
    ]);
    setSteps(todaySteps);
    setSleepMinutes(todaySleep);

    // HealthKitへの同時並列クエリが多すぎると結果が欠落することがあるため、1日ずつ順番に処理する
    for (let i = 0; i < syncKeys.length; i++) {
      const key = syncKeys[i];
      if (!needsMetricsSync(syncRecords[i])) continue;
      try {
        const dayDate = fromDateKey(key);
        const daySteps = await fetchStepsCount(dayDate);
        const daySleep = await fetchSleepMinutes(dayDate);
        if (daySteps !== null || daySleep !== null) {
          await saveDay(key, {
            ...(daySteps !== null ? { steps: daySteps } : {}),
            ...(daySleep !== null ? { sleepMinutes: daySleep } : {}),
          });
        }
      } catch (e) {
        // 1日分の同期失敗が他の日・この後のレポート生成トリガーに影響しないようにする
        console.error('metrics sync failed', key, e);
      }
    }

    // 直近の記録が1件もない場合（インストール直後）は、
    // 存在しない「前日」の入力を求めない
    const recentKeys = getRecentDateKeys(8, yesterday);
    const recentRecords = await getDays(recentKeys);
    const hasAnyHistory = recentRecords.some((r) => r !== null);
    const yesterdayRecord = recentRecords[0] ?? null;

    if (hasAnyHistory && yesterdayRecord?.happiness === undefined) {
      setPendingInput({ dateKey: yesterdayKey, question: '昨日はどんな一日でしたか' });
      setInputWindowNotYetOpen(false);
      setTodayRecord(null);
      return;
    }

    const today = await getDay(todayKey);
    setTodayRecord(today);

    if (today?.happiness === undefined) {
      const windowOpen = isTodayInputWindowOpen(
        now,
        currentSettings.bedtimeHour,
        currentSettings.bedtimeMinute,
      );
      if (windowOpen) {
        setPendingInput({ dateKey: todayKey, question: '今日はどんな一日でしたか' });
        setInputWindowNotYetOpen(false);
      } else {
        setPendingInput(null);
        setInputWindowNotYetOpen(true);
      }
    } else {
      setPendingInput(null);
      setInputWindowNotYetOpen(false);
      if (today.report === undefined) {
        void generateAndSaveReport(todayKey, today.happiness, todaySteps, todaySleep, now).then(
          (saved) => {
            if (saved) setTodayRecord(saved);
          },
        );
      }
    }
  }, [generateAndSaveReport]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequestAuth = async () => {
    await requestHealthAuthorization();
    const updated = await saveSettings({ healthAuthRequested: true });
    setSettings(updated);
    await load();
  };

  const handleSelectHappiness = async (value: HappinessLevel) => {
    if (!pendingInput) return;
    await saveDay(pendingInput.dateKey, { happiness: value });
    setPendingInput(null);
    await load();
  };

  if (available === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>このデバイスではHealthKitを利用できません</Text>
      </View>
    );
  }

  if (available === null) {
    return <View style={styles.center} />;
  }

  if (settings && !settings.healthAuthRequested) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          歩数と睡眠のデータを読み取って、あなた専用のレポートを作成します
        </Text>
        <Button title="権限をリクエスト" onPress={handleRequestAuth} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.metrics}>
        <StepsDisplay steps={steps} />
        <SleepDisplay minutes={sleepMinutes} />
      </View>

      {pendingInput && (
        <HappinessInput question={pendingInput.question} onSelect={handleSelectHappiness} />
      )}

      {!pendingInput && inputWindowNotYetOpen && (
        <Text style={styles.message}>就寝予定時刻の1時間前から今日の記録ができます</Text>
      )}

      {!pendingInput &&
        !inputWindowNotYetOpen &&
        todayRecord?.happiness !== undefined &&
        (todayRecord.report ? <ReportView report={todayRecord.report} /> : <GeneratingIndicator />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  metrics: {
    alignItems: 'center',
    gap: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
