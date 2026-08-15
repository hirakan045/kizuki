import type { DiscoveryKind } from '../types';

export type ReportHistoryDay = {
  dateKey: string;
  steps: number | null;
  sleepMinutes: number | null;
};

export type GenerateReportInput = {
  /** 直近30日分、古い→新しい順。最後の要素が対象日 */
  history: ReportHistoryDay[];
  happiness: number | null;
  /** 直近2日分に使われた発見の種類（新しい順、0〜2件） */
  recentDiscoveryKinds: DiscoveryKind[];
};

export type GenerateReportResult = {
  report: string;
  discoveryKind: DiscoveryKind;
};

/**
 * レポート生成APIを呼び出す。
 * 失敗時（HTTPエラー・ネットワークエラー）は例外を投げる。
 * リトライ・オフライン時の挙動は呼び出し側（WBS 5.3.5）で扱う。
 */
export async function generateReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-secret': process.env.EXPO_PUBLIC_APP_SHARED_SECRET ?? '',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`generateReport failed: ${response.status}`);
  }

  return (await response.json()) as GenerateReportResult;
}
