import { useCallback, useRef } from 'react';
import { generateReport } from '../lib/reportApi';
import { getDays, saveDay } from '../storage/dayRecord';
import { getRecentDateKeys } from '../utils/date';
import { buildReportRequest } from '../logic/reportRequest';
import type { DayRecord } from '../types';

/**
 * 対象日を指定してレポートを生成・保存する。
 * 今日タブ・日別詳細画面の両方から使う（対象日は今日にも過去日にもなりうる）。
 */
export function useReportGeneration() {
  const generatingRef = useRef(false);

  const generateAndSaveReport = useCallback(
    async (
      targetKey: string,
      happiness: number,
      targetSteps: number | null,
      targetSleepMinutes: number | null,
      from: Date,
    ): Promise<DayRecord | null> => {
      console.log('[useReportGeneration.generateAndSaveReport] start', {
        targetKey,
        happiness,
        targetSteps,
        targetSleepMinutes,
        from,
      });
      if (generatingRef.current) {
        console.log('[useReportGeneration.generateAndSaveReport] end (already generating)');
        return null;
      }
      generatingRef.current = true;
      try {
        const dateKeys = getRecentDateKeys(30, from).reverse();
        const records = await getDays(dateKeys);
        const input = buildReportRequest({
          dateKeys,
          records,
          targetDaySteps: targetSteps,
          targetDaySleepMinutes: targetSleepMinutes,
          targetDayHappiness: happiness,
        });
        const result = await generateReport(input);
        const saved = await saveDay(targetKey, {
          report: result.report,
          discoveryKind: result.discoveryKind,
          generatedAt: new Date().toISOString(),
          ...(targetSteps !== null ? { steps: targetSteps } : {}),
          ...(targetSleepMinutes !== null ? { sleepMinutes: targetSleepMinutes } : {}),
        });
        console.log('[useReportGeneration.generateAndSaveReport] end', targetKey, '->', saved);
        return saved;
      } catch (e) {
        console.error('generateAndSaveReport failed', targetKey, e);
        console.log('[useReportGeneration.generateAndSaveReport] end (error)', targetKey);
        return null;
      } finally {
        generatingRef.current = false;
      }
    },
    [],
  );

  return { generateAndSaveReport };
}
