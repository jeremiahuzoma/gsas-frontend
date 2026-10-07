import type {
  ApplianceRow,
  ConfigItem,
  MeterConfigurationRow,
  MeterSnapshot,
  Ok,
} from "@/types/api";

import { api } from "./client";

export const listAppliances = () => api.get<ApplianceRow[]>("/appliances");

export const addApplianceToMeter = (data: { meterId: string; applianceId: string }) =>
  api.post<MeterSnapshot>(`/meters/${data.meterId}/appliances`, { applianceId: data.applianceId });

export const setApplianceState = (data: { meterId: string; linkId: string; isOn: boolean }) =>
  api.patch<MeterSnapshot>(`/meters/${data.meterId}/appliances/${data.linkId}`, {
    isOn: data.isOn,
  });

export const removeApplianceFromMeter = (data: { meterId: string; linkId: string }) =>
  api.delete<MeterSnapshot>(`/meters/${data.meterId}/appliances/${data.linkId}`);

export const replaceMeterAppliances = (data: { meterId: string; items: ConfigItem[] }) =>
  api.put<MeterSnapshot>(`/meters/${data.meterId}/appliances`, { items: data.items });

export const listMeterConfigurations = (data: { meterId: string }) =>
  api.get<MeterConfigurationRow[]>(`/meters/${data.meterId}/configurations`);

export const saveMeterConfiguration = ({
  meterId,
  ...body
}: {
  meterId: string;
  name: string;
  makeDefault?: boolean;
  items?: ConfigItem[];
}) => api.post<MeterConfigurationRow>(`/meters/${meterId}/configurations`, body);

export const applyMeterConfiguration = (data: { meterId: string; configurationId: string }) =>
  api.post<MeterSnapshot>(`/meters/${data.meterId}/configurations/${data.configurationId}/apply`);

export const setDefaultConfiguration = (data: { meterId: string; configurationId: string }) =>
  api.post<Ok>(`/meters/${data.meterId}/configurations/${data.configurationId}/default`);

export const deleteMeterConfiguration = (data: { meterId: string; configurationId: string }) =>
  api.delete<Ok>(`/meters/${data.meterId}/configurations/${data.configurationId}`);
