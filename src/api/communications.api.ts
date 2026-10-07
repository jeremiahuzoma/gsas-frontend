import type { CommsConfig } from "@/types/api";

import { api } from "./client";

export const getCommsConfig = () => api.get<CommsConfig>("/communications/config");

export const sendTestSms = (data: { meterId: string; phoneNumber: string; message?: string }) =>
  api.post<{ status: string; providerMessageId: string | null }>("/communications/test-sms", data);
