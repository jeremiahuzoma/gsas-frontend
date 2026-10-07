/**
 * Response types for the NestJS API.
 *
 * Row-shaped payloads keep the database's snake_case column names on purpose:
 * they are the same shapes the Supabase-backed server functions returned, so
 * the existing UI reads them unchanged. Numeric columns arrive as numbers.
 */

export type UsageProfile = "CONSTANT" | "CYCLIC" | "INTERMITTENT";
export type GsmStatus = "CONNECTED" | "WEAK" | "DISCONNECTED";
export type MeterStatus = "ACTIVE" | "LOW" | "CRITICAL" | "URGENT" | "DEPLETED" | "INACTIVE";
export type AppRole = "admin" | "customer";

export interface SimEvent {
  at: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

export interface SnapshotAppliance {
  id: string;
  applianceId: string;
  name: string;
  icon: string;
  category: string;
  isOn: boolean;
  ratedPower: number;
  currentPower: number;
  energyKwh: number;
  usageProfile: string;
}

/** Live meter view (SSE `meter.updated`). */
export interface MeterSnapshot {
  id: string;
  meterNumber: string;
  customerName: string;
  phoneNumber: string | null;
  balanceKwh: number;
  initialBalance: number;
  totalConsumedKwh: number;
  voltage: number;
  currentAmps: number;
  powerWatts: number;
  frequencyHz: number;
  powerFactor: number;
  status: string;
  gsm: string;
  signalDbm: number;
  tariffPerKwh: number;
  thresholds: { low: number; critical: number; urgent: number };
  simulationRunning: boolean;
  simulationSpeed: number;
  simulatedSeconds: number;
  estimatedRemaining: string;
  appliances: SnapshotAppliance[];
  events: SimEvent[];
  updatedAt: string;
}

export interface Me {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  roles: AppRole[];
  isAdmin: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: Me;
}

export interface ApplianceRow {
  id: string;
  name: string;
  category: string;
  icon: string;
  rated_power: number;
  idle_power: number;
  voltage: number;
  power_factor: number;
  usage_profile: UsageProfile;
  duty_cycle: number;
  cycle_seconds: number;
  created_at: string;
}

export interface ConfigItem {
  applianceId: string;
  isOn: boolean;
}

export interface MeterConfigurationRow {
  id: string;
  name: string;
  is_default: boolean;
  items: ConfigItem[] | unknown;
  updated_at: string;
}

export interface RechargeResult {
  previous: number;
  next: number;
  reference: string;
  snapshot: MeterSnapshot;
}

export interface MeterListRow {
  id: string;
  meter_number: string;
  customer_name: string;
  phone_number: string | null;
  balance_kwh: number;
  status: MeterStatus;
  gsm: GsmStatus;
  simulation_running: boolean;
  created_at: string;
}

export interface AdminMeterRow {
  id: string;
  meter_number: string;
  customer_name: string;
  phone_number: string | null;
  balance_kwh: number;
  total_consumed_kwh: number;
  status: MeterStatus;
  gsm: GsmStatus;
  tariff_per_kwh: number;
  low_threshold: number;
  critical_threshold: number;
  urgent_threshold: number;
  simulation_running: boolean;
  user_id: string;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  key: string;
  body: string;
  updated_at: string;
}

export interface SmsLogRow {
  id: string;
  meter_id?: string | null;
  user_id?: string | null;
  alert_id?: string | null;
  phone_number: string;
  message: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  failure_reason: string | null;
  cost?: string | null;
  attempts: number | null;
  next_attempt_at: string | null;
  last_attempt_at?: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  event_type: string;
  external_id: string;
  signature_verified: boolean;
  status: string;
  created_at: string;
}

export interface RetrySummary {
  scanned: number;
  sent: number;
  failed: number;
  exhausted: number;
}

export interface AlertRow {
  id: string;
  meter_id: string;
  user_id: string;
  type: string;
  severity: string;
  threshold: number | null;
  balance_kwh: number | null;
  message: string;
  sms_status: string | null;
  created_at: string;
  meter: { meter_number: string } | null;
}

export interface UssdSessionRow {
  id: string;
  session_id: string;
  phone_number: string;
  service_code: string | null;
  meter_id: string | null;
  user_id: string | null;
  request_text: string | null;
  response_text: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export interface RechargeRow {
  id: string;
  meter_id: string;
  amount_kwh: number;
  previous_balance: number;
  new_balance: number;
  reference: string;
  created_at: string;
  meter: { meter_number: string } | null;
}

export interface MeterReadingRow {
  id: number;
  meter_id: string;
  voltage: number;
  current_amps: number;
  power_watts: number;
  frequency_hz: number;
  power_factor: number;
  energy_kwh: number;
  balance_kwh: number;
  recorded_at: string;
}

export interface MeterAnalytics {
  tariff: number;
  totalEnergy: number;
  avgLoad: number;
  peakLoad: number;
  avgVoltage: number;
  estimatedCost: number;
  series: {
    t: string;
    power: number;
    voltage: number;
    current: number;
    energy: number;
    balance: number;
  }[];
  byAppliance: { name: string; energy: number }[];
  daily: { day: string; energy: number }[];
}

export interface OpsAnalytics {
  rangeDays: number;
  buckets: {
    label: string;
    energy: number;
    cost: number;
    avgPower: number;
    peakPower: number;
    alerts: number;
  }[];
  consumption: {
    totalEnergy: number;
    totalCost: number;
    avgPower: number;
    peakPower: number;
    readings: number;
    tariff: number;
  };
  crossings: { type: string; count: number }[];
  crossingsBySeverity: { severity: string; count: number }[];
  sms: {
    total: number;
    delivered: number;
    sent: number;
    failed: number;
    pending: number;
    successRate: number;
    avgAttempts: number;
    maxAttempts: number;
    retried: number;
  };
  ussd: { total: number; completed: number; active: number; completionRate: number };
  retryTrend: { label: string; avgAttempts: number; failed: number; delivered: number }[];
}

export interface CommsConfig {
  configured: boolean;
  environment: string;
  senderId: string;
  serviceCode: string;
}

export interface Ok {
  ok: true;
}
