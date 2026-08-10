import { useEffect, useState } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import HealthKit, {
  isHealthDataAvailable,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { fetchSleepMinutes } from "./src/lib/healthkit";

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

  // 歩数（統計クエリ = iPhone と Watch の重複を HealthKit 側で排除）
  const fetchSteps = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const result = await HealthKit.queryStatisticsForQuantity(
        "HKQuantityTypeIdentifierStepCount",
        ["cumulativeSum"],
        {
          filter: {
            date: { startDate: startOfDay, endDate: now },
          },
        },
      );

      console.log("歩数の統計:", JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("歩数取得失敗", e);
    }
  };

  // 睡眠（Category 型なので別関数）
  const fetchSleep = async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const samples = await HealthKit.queryCategorySamples(
        "HKCategoryTypeIdentifierSleepAnalysis",
        {
          limit: 0,
          filter: {
            date: { startDate: yesterday, endDate: now },
          },
        },
      );

      console.log("睡眠サンプル数:", samples.length);
      console.log("睡眠データ:", JSON.stringify(samples, null, 2));
    } catch (e) {
      console.error("睡眠取得失敗", e);
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
