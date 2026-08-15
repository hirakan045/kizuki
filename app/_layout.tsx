import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{ title: '設定', headerBackButtonDisplayMode: 'minimal' }}
      />
      <Stack.Screen name="day/[date]" options={{ title: '' }} />
    </Stack>
  );
}
