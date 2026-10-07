import type {
  AdminMeterRow,
  Ok,
  RetrySummary,
  SmsLogRow,
  TemplateRow,
  UsageProfile,
  WebhookEventRow,
} from "@/types/api";

import { api } from "./client";

export const getAdminContext = () => api.get<{ isAdmin: boolean }>("/admin/context");

export const claimAdmin = () => api.post<{ granted: boolean }>("/admin/claim");

export const adminListMeters = () => api.get<AdminMeterRow[]>("/admin/meters");

export const adminUpdateMeter = ({
  meterId,
  ...data
}: {
  meterId: string;
  customerName?: string;
  phoneNumber?: string;
  tariff?: number;
  low?: number;
  critical?: number;
  urgent?: number;
  status?: "ACTIVE" | "INACTIVE";
  gsm?: "CONNECTED" | "WEAK" | "DISCONNECTED";
}) => api.patch<Ok>(`/admin/meters/${meterId}`, data);

export const adminListTemplates = () => api.get<TemplateRow[]>("/admin/templates");

export const adminSaveTemplate = (data: { key: string; body: string }) =>
  api.put<Ok>("/admin/templates", data);

export const adminSaveAppliance = ({
  id,
  ...data
}: {
  id?: string;
  name: string;
  category: string;
  icon: string;
  ratedPower: number;
  idlePower: number;
  usageProfile: UsageProfile;
  dutyCycle: number;
  cycleSeconds: number;
  powerFactor: number;
}) =>
  id ? api.patch<Ok>(`/admin/appliances/${id}`, data) : api.post<Ok>("/admin/appliances", data);

export const adminDeleteAppliance = (data: { id: string }) =>
  api.delete<Ok>(`/admin/appliances/${data.id}`);

export const adminListSmsLogs = (data: { limit?: number } = {}) =>
  api.get<SmsLogRow[]>("/admin/sms-logs", { limit: data.limit ?? 60 });

export const adminListWebhookEvents = () => api.get<WebhookEventRow[]>("/admin/webhook-events");

export const adminRetrySms = (data: { logId?: string } = {}) =>
  api.post<RetrySummary>("/admin/sms/retry", data);
