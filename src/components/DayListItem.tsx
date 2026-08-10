import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { happinessEmoji } from '../constants/happiness';
import { formatSleepMinutes, formatSteps } from '../utils/format';

type Props = {
  dateKey: string;
  dateLabel: string;
  steps: number | null;
  sleepMinutes: number | null;
  happiness: number | null;
  onPress: () => void;
};

export function DayListItem({ dateLabel, steps, sleepMinutes, happiness, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.value}>{steps !== null ? formatSteps(steps) : '―'}</Text>
      <Text style={styles.value}>
        {sleepMinutes !== null ? formatSleepMinutes(sleepMinutes) : '―'}
      </Text>
      <Text style={styles.emoji}>{happiness !== null ? happinessEmoji(happiness) : '―'}</Text>
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
    gap: 12,
  },
  date: {
    width: 72,
    fontSize: 14,
    color: colors.text,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emoji: {
    fontSize: 18,
  },
});
