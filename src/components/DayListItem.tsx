import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { happinessOption } from '../constants/happiness';
import { formatSleepDuration, formatSteps } from '../utils/format';

type Props = {
  dateKey: string;
  dateLabel: string;
  steps: number | null;
  sleepMinutes: number | null;
  happiness: number | null;
  onPress: () => void;
};

/** 履歴一覧の列幅。DayListHeaderもこれを参照し、ヘッダーとデータ行の列を揃える */
export const DAY_LIST_COLUMN_WIDTHS = {
  gap: 12,
  date: 72,
  happiness: 48,
};

export function DayListItem({ dateLabel, steps, sleepMinutes, happiness, onPress }: Props) {
  const option = happiness !== null ? happinessOption(happiness) : undefined;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.value}>{steps !== null ? formatSteps(steps) : '―'}</Text>
      <Text style={styles.value}>
        {sleepMinutes !== null ? formatSleepDuration(sleepMinutes) : '―'}
      </Text>
      <View style={styles.emoji}>
        {option ? (
          <MaterialCommunityIcons name={option.icon} size={24} color={option.color} />
        ) : (
          <Text style={styles.value}>―</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: DAY_LIST_COLUMN_WIDTHS.gap,
  },
  date: {
    width: DAY_LIST_COLUMN_WIDTHS.date,
    fontSize: 14,
    color: colors.text,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emoji: {
    width: DAY_LIST_COLUMN_WIDTHS.happiness,
    alignItems: 'center',
  },
});
