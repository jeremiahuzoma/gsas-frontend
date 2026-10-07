import type { MeterListRow, MeterSnapshot, Ok, RechargeResult } from "@/types/api";

import { apiUrl, api } from "./client";

/** Oldest meter visible to the caller, or null (was getMeterState). */
export const getMeterState = async () =>
  (await api.get<{ snapshot: MeterSnapshot | null }>("/meters/current")).snapshot;

export const listMeters = () => api.get<MeterListRow[]>("/meters");

export const getMeter = (meterId: string) => api.get<MeterSnapshot>(`/meters/${meterId}`);

export const controlSimulation = (data: {
  meterId: string;
  action: "start" | "pause" | "reset";
  speed?: number;
}) =>
  api.post<MeterSnapshot>(
    `/meters/${data.meterId}/simulation/${data.action}`,
    data.action === "start" && data.speed ? { speed: data.speed } : {},
  );

export const setSimulationSpeed = (data: { meterId: string; speed: number }) =>
  api.patch<Ok>(`/meters/${data.meterId}/simulation/speed`, { speed: data.speed });

export const startDemoMode = (data: { meterId: string }) =>
  api.post<MeterSnapshot>(`/meters/${data.meterId}/simulation/demo`);

export const forceThreshold = (data: { meterId: string; balance: number }) =>
  api.post<MeterSnapshot>(`/meters/${data.meterId}/simulation/force-threshold`, {
    balance: data.balance,
  });

export const rechargeMeter = (data: { meterId: string; amountKwh: number }) =>
  api.post<RechargeResult>(`/meters/${data.meterId}/recharge`, { amountKwh: data.amountKwh });

export const updateMeterSettings = ({
  meterId,
  ...settings
}: {
  meterId: string;
  phoneNumber?: string;
  customerName?: string;
  tariff?: number;
  low?: number;
  critical?: number;
  urgent?: number;
  gsm?: "CONNECTED" | "WEAK" | "DISCONNECTED";
  initialBalance?: number;
}) => api.patch<MeterSnapshot>(`/meters/${meterId}`, settings);

/** EventSource URL for the live stream (EventSource cannot send headers, so the JWT goes in the query). */
export const meterStreamUrl = (meterId: string, token: string) =>
  apiUrl(`/meters/${encodeURIComponent(meterId)}/events/stream`, { access_token: token });
