/**
 * 1日分の記録。
 * 日付をキーに AsyncStorage へ保存する（key: `day:YYYY-MM-DD`）。
 *
 * 歩数・睡眠時間は HealthKit が保持しているが、アプリ側にも保存する。
 * レポート未生成の日は起動時に同期される（直近30日分、WBS 5.3.8）。
 * レポート生成後は値を固定し、以降は上書きしない。
 * HealthKit のデータは Watch の遅延同期などで後から書き換わるため、
 * レポート本文と表示値が食い違うのを防ぐ。
 */
export type DayRecord = {
  /** 幸福度 1〜5。未入力なら undefined */
  happiness?: number;

  /** 歩数（未生成日は起動時同期、生成後はレポート生成時点の値で固定） */
  steps?: number;

  /** 睡眠時間・分（未生成日は起動時同期、生成後はレポート生成時点の値で固定） */
  sleepMinutes?: number;

  /** AI が生成したレポート本文 */
  report?: string;

  /** レポート生成日時（ISO 8601） */
  generatedAt?: string;

  /** そのレポートで使われた発見の種類（3日連続回避の判定に使う） */
  discoveryKind?: DiscoveryKind;
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
