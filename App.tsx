import { useEffect, useState } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import HealthKit, {
  isHealthDataAvailable,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { fetchSleep, fetchSleepMinutes, fetchSteps } from "./src/lib/healthkit";
import { toDateKey } from "./src/utils/date";
import { getDay, saveDay, getDays } from "./src/storage/dayRecord";
import { getRecentDateKeys } from "./src/utils/date";

export default function App() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setAvailable(isHealthDataAvailable());
  }, []);

  const handleAuth = async () => {
    try {
      await requestAuthorization({
        toRead: [
          "HKQuantityTypeIdentifierStepCount",
          "HKCategoryTypeIdentifierSleepAnalysis",
        ],
      });
      setAuthorized(true);
      console.log("認証OK");
    } catch (e) {
      console.error("認証失敗", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text>HealthKit利用可否: {String(available)}</Text>
      <Text>認証済み: {String(authorized)}</Text>
      <Button title="権限をリクエスト" onPress={handleAuth} />
      <Button title="歩数を取得" onPress={fetchSteps} />
      <Button title="睡眠を取得" onPress={fetchSleep} />
      <Button title="睡眠時間を算出" onPress={handleSleep} />
      <Button title="ストレージ確認" onPress={handleStorageTest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
});

const handleSleep = async () => {
  const minutes = await fetchSleepMinutes(new Date());
  console.log("睡眠時間（分）:", minutes);
  if (minutes !== null) {
    console.log(`${Math.floor(minutes / 60)}時間${minutes % 60}分`);
  }
};

const handleStorageTest = async () => {
  const today = toDateKey(new Date());

  // 保存
  await saveDay(today, { happiness: 4 });
  console.log("保存後:", await getDay(today));

  // マージの確認（happiness が消えないこと）
  await saveDay(today, { steps: 8432 });
  console.log("マージ後:", await getDay(today));

  // 一括取得
  const keys = getRecentDateKeys(7);
  console.log("直近7日:", await getDays(keys));
};
