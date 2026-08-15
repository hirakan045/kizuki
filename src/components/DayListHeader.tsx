import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { DAY_LIST_COLUMN_WIDTHS } from './DayListItem';

/** 履歴一覧の列名ヘッダー。DayListItemと同じ列幅を使い、データ行と揃える */
export function DayListHeader() {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, styles.date]}>日付</Text>
      <Text style={[styles.label, styles.value]}>歩数</Text>
      <Text style={[styles.label, styles.value]}>睡眠</Text>
      <Text style={[styles.label, styles.happiness]}>幸福度</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: DAY_LIST_COLUMN_WIDTHS.gap,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  date: {
    width: DAY_LIST_COLUMN_WIDTHS.date,
  },
  value: {
    flex: 1,
  },
  happiness: {
    width: DAY_LIST_COLUMN_WIDTHS.happiness,
  },
});
