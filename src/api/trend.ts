import { api, query } from './client';
import { useApi } from './useApi';
import type { ReportSummary } from './types';

/** Daily confirmed findings for the trend graphics (from the report endpoint). */
export function useDailyTrend(range: '7d' | '30d' = '7d') {
  const report = useApi(() => api.get<ReportSummary>(`/api/reports/summary${query({ range })}`), [range]);
  const daily = report.data?.daily ?? [];
  return {
    infiltration: daily.map((d) => d.infiltration),
    phlebitis: daily.map((d) => d.phlebitis),
    analyses: daily.map((d) => d.analyses)
  };
}

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
