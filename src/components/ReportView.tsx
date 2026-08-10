import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type Props = { report: string };

export function ReportView({ report }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{report}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
});
