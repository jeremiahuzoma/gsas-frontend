import type { AlertRow, RechargeRow, SmsLogRow, UssdSessionRow } from "@/types/api";

import { api } from "./client";

export const getAlerts = () => api.get<AlertRow[]>("/alerts");
export const getSmsLogs = () => api.get<SmsLogRow[]>("/sms-logs");
export const getUssdSessions = () => api.get<UssdSessionRow[]>("/ussd-sessions");
export const getRecharges = () => api.get<RechargeRow[]>("/recharges");
