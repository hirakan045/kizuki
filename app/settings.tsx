import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSettings, saveSettings, type Settings } from '../src/storage/settings';
import { colors } from '../src/constants/colors';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = useCallback(async () => {
    setSettings(await getSettings());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return null;

  const bedtime = new Date();
  bedtime.setHours(settings.bedtimeHour, settings.bedtimeMinute, 0, 0);

  const handleChangeBedtime = async (_event: unknown, selected?: Date) => {
    if (!selected) return;
    const updated = await saveSettings({
      bedtimeHour: selected.getHours(),
      bedtimeMinute: selected.getMinutes(),
    });
    setSettings(updated);
  };

  const handleToggleNotifications = async (value: boolean) => {
    const updated = await saveSettings({ notificationsEnabled: value });
    setSettings(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>就寝予定時刻</Text>
        <DateTimePicker
          value={bedtime}
          mode="time"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={handleChangeBedtime}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>通知</Text>
        <Switch value={settings.notificationsEnabled} onValueChange={handleToggleNotifications} />
      </View>

      <Text style={styles.note}>
        きづきは医療機器ではありません。診断や治療を目的としたものではないため、体調に関する判断は医療機関にご相談ください。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.text,
  },
  note: {
    marginTop: 24,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
