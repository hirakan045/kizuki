import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { HAPPINESS_OPTIONS } from '../constants/happiness';
import type { HappinessLevel } from '../types';

type Props = {
  question: string;
  onSelect: (value: HappinessLevel) => void;
};

export function HappinessInput({ question, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.row}>
        {HAPPINESS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={styles.option}
          >
            <MaterialCommunityIcons name={option.icon} size={40} color={option.color} />
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
