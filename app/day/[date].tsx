import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getDay, saveDay } from '../../src/storage/dayRecord';
import { fromDateKey } from '../../src/utils/date';
import {
  formatDateQuestion,
  formatDateWithWeekday,
  formatSleepMinutes,
  formatSteps,
} from '../../src/utils/format';
import { happinessEmoji } from '../../src/constants/happiness';
import { HappinessInput } from '../../src/components/HappinessInput';
import { ReportView } from '../../src/components/ReportView';
import { colors } from '../../src/constants/colors';
import type { DayRecord, HappinessLevel } from '../../src/types';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [record, setRecord] = useState<DayRecord | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setRecord(await getDay(date));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectHappiness = async (value: HappinessLevel) => {
    if (!date) return;
    await saveDay(date, { happiness: value });
    await load();
  };

  if (!date) return null;

  const dateObj = fromDateKey(date);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: formatDateWithWeekday(dateObj) }} />

      <View style={styles.metrics}>
        <Text style={styles.steps}>{record?.steps != null ? formatSteps(record.steps) : '―'}</Text>
        <Text style={styles.sleep}>
          睡眠 {record?.sleepMinutes != null ? formatSleepMinutes(record.sleepMinutes) : '―'}
        </Text>
      </View>

      {record?.happiness !== undefined ? (
        <Text style={styles.happiness}>幸福度: {happinessEmoji(record.happiness)}</Text>
      ) : (
        <HappinessInput question={formatDateQuestion(dateObj)} onSelect={handleSelectHappiness} />
      )}

      {record?.report && <ReportView report={record.report} />}
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
  happiness: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});
