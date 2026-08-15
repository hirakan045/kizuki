import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { formatSleepDuration } from '../utils/format';

type Props = { minutes: number | null };

export function SleepDisplay({ minutes }: Props) {
  return (
    <Text style={styles.text}>睡眠 {minutes !== null ? formatSleepDuration(minutes) : '―'}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 20,
    color: colors.sleep,
  },
});
