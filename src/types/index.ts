/**
 * 1日分の記録。
 * 日付をキーに AsyncStorage へ保存する（key: `day:YYYY-MM-DD`）。
 *
 * 歩数・睡眠時間は HealthKit が保持しているが、
 * レポート生成時点の値を保存しておく。
 * HealthKit のデータは Watch の遅延同期などで後から書き換わるため、
 * レポート本文と表示値が食い違うのを防ぐ。
 */
export type DayRecord = {
  /** 幸福度 1〜5。未入力なら undefined */
  happiness?: number;

  /** レポート生成時点の歩数 */
  steps?: number;

  /** レポート生成時点の睡眠時間（分） */
  sleepMinutes?: number;

  /** AI が生成したレポート本文 */
  report?: string;

  /** レポート生成日時（ISO 8601） */
  generatedAt?: string;
};

/** 幸福度の選択肢 */
export const HAPPINESS_LEVELS = [1, 2, 3, 4, 5] as const;
export type HappinessLevel = (typeof HAPPINESS_LEVELS)[number];

/**
 * 発見の種類（PRD F-3-5）。
 * データの蓄積状況に応じて成立するものが変わる。
 */
export type DiscoveryKind =
  | 'personalBest' // D-1 過去最高
  | 'deviationFromAverage' // D-2 平均との差
  | 'correlation' // D-3 連動
  | 'weekdayPattern' // D-4 曜日の傾向
  | 'weeklyChange' // D-5 週次の変化
  | 'dataAccumulation'; // D-6 データ蓄積の予告（フォールバック）

/** レポート生成時に AI へ渡す発見の素材 */
export type Discovery = {
  kind: DiscoveryKind;
  /** AI に渡す事実の記述。促す表現を含めない */
  fact: string;
};
