import { Link, Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          headerRight: () => (
            <Link href="/settings" accessibilityLabel="設定" style={{ paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </Link>
          ),
        }}
      />
      <Tabs.Screen name="history" options={{ title: '履歴' }} />
    </Tabs>
  );
}
