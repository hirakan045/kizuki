import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

export function GeneratingIndicator() {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>レポートを作成しています</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
