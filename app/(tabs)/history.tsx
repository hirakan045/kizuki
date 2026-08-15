import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDays } from '../../src/storage/dayRecord';
import { getRecentDateKeys } from '../../src/utils/date';
import { DayListItem } from '../../src/components/DayListItem';
import type { DayRecord } from '../../src/types';

const HISTORY_DAYS = 30;

type Row = { dateKey: string; dateLabel: string; record: DayRecord | null };

const formatDateLabel = (dateKey: string): string => {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}/${day}`;
};

export default function HistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const keys = getRecentDateKeys(HISTORY_DAYS);
    const records = await getDays(keys);
    setRows(
      keys.map((dateKey, i) => ({
        dateKey,
        dateLabel: formatDateLabel(dateKey),
        record: records[i],
      })),
    );
  }, []);

  // タブを離れて戻ってきたときにも最新の状態を反映する
  // （画面はアンマウントされず保持されるため、通常のuseEffectでは再取得できない）
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={styles.list}
      data={rows}
      keyExtractor={(row) => row.dateKey}
      renderItem={({ item }) => (
        <DayListItem
          dateKey={item.dateKey}
          dateLabel={item.dateLabel}
          steps={item.record?.steps ?? null}
          sleepMinutes={item.record?.sleepMinutes ?? null}
          happiness={item.record?.happiness ?? null}
          onPress={() => router.push(`/day/${item.dateKey}`)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
