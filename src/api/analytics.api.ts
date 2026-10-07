import type { MeterAnalytics, MeterReadingRow, OpsAnalytics } from "@/types/api";

import { api } from "./client";

export const getOpsAnalytics = (data: { days: number; meterId?: string }) =>
  api.get<OpsAnalytics>("/analytics/ops", { days: data.days, meterId: data.meterId });

export const getReadings = (data: { meterId: string; days: number }) =>
  api.get<MeterReadingRow[]>(`/meters/${data.meterId}/readings`, { days: data.days });

export const getAnalytics = (data: { meterId: string; days: number }) =>
  api.get<MeterAnalytics>(`/meters/${data.meterId}/analytics`, { days: data.days });
