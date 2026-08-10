import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { formatSteps } from '../utils/format';

type Props = { steps: number | null };

export function StepsDisplay({ steps }: Props) {
  return <Text style={styles.text}>{steps !== null ? formatSteps(steps) : '― 歩'}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.steps,
  },
});
