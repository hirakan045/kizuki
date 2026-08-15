import { useCallback, useEffect, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { clearDay, getDay, saveDay } from '../../src/storage/dayRecord';
import { fromDateKey, isWithinRecentWindow } from '../../src/utils/date';
import {
  formatDateQuestion,
  formatDateWithWeekday,
  formatSleepDuration,
  formatSteps,
} from '../../src/utils/format';
import { happinessOption } from '../../src/constants/happiness';
import { useReportGeneration } from '../../src/hooks/useReportGeneration';
import { HappinessInput } from '../../src/components/HappinessInput';
import { GeneratingIndicator } from '../../src/components/GeneratingIndicator';
import { ReportView } from '../../src/components/ReportView';
import { colors } from '../../src/constants/colors';
import type { DayRecord, HappinessLevel } from '../../src/types';

/** レポートを生成する対象日として扱う範囲（5.3.8で歩数・睡眠が同期される範囲と合わせる） */
const REPORT_WINDOW_DAYS = 30;

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [record, setRecord] = useState<DayRecord | null>(null);
  const { generateAndSaveReport } = useReportGeneration();

  const load = useCallback(async () => {
    if (!date) return;
    const current = await getDay(date);
    setRecord(current);

    if (
      current?.happiness !== undefined &&
      current.report === undefined &&
      isWithinRecentWindow(date, REPORT_WINDOW_DAYS)
    ) {
      const saved = await generateAndSaveReport(
        date,
        current.happiness,
        current.steps ?? null,
        current.sleepMinutes ?? null,
        fromDateKey(date),
      );
      if (saved) setRecord(saved);
    }
  }, [date, generateAndSaveReport]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectHappiness = async (value: HappinessLevel) => {
    if (!date) return;
    await saveDay(date, { happiness: value });
    await load();
  };

  /** プロンプト調整用。開発ビルドでのみ表示する（本番には出さない） */
  const handleClearForTesting = async () => {
    if (!date) return;
    await clearDay(date);
    await load();
  };

  if (!date) return null;

  const dateObj = fromDateKey(date);
  const happinessIcon =
    record?.happiness !== undefined ? happinessOption(record.happiness) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ title: formatDateWithWeekday(dateObj), headerBackTitle: '' }}
      />

      <View style={styles.metrics}>
        <Text style={styles.steps}>{record?.steps != null ? formatSteps(record.steps) : '―'}</Text>
        <Text style={styles.sleep}>
          睡眠 {record?.sleepMinutes != null ? formatSleepDuration(record.sleepMinutes) : '―'}
        </Text>
      </View>

      {record?.happiness !== undefined ? (
        <View style={styles.happinessRow}>
          <Text style={styles.happiness}>幸福度:</Text>
          {happinessIcon && (
            <MaterialCommunityIcons name={happinessIcon.icon} size={20} color={happinessIcon.color} />
          )}
        </View>
      ) : (
        <HappinessInput question={formatDateQuestion(dateObj)} onSelect={handleSelectHappiness} />
      )}

      {record?.report ? (
        <ReportView report={record.report} />
      ) : (
        record?.happiness !== undefined &&
        isWithinRecentWindow(date, REPORT_WINDOW_DAYS) && <GeneratingIndicator />
      )}

      {__DEV__ && (record?.happiness !== undefined || record?.report !== undefined) && (
        <Button title="（テスト用）幸福度・レポートをクリア" onPress={handleClearForTesting} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
  },
  metrics: {
    alignItems: 'center',
    gap: 8,
  },
  steps: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.steps,
  },
  sleep: {
    fontSize: 18,
    color: colors.sleep,
  },
  happinessRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  happiness: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});
