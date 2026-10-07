import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { getOpsAnalytics } from "@/api/analytics.api";

const RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Kpi({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="label-caps">{label}</p>
      <p className="digit mt-1 text-2xl font-semibold text-primary">
        {value}
        {unit ? <span className="ml-1 text-xs text-muted-foreground">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 10,
  tickLine: false,
} as const;

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  useDocumentMeta({
    title: "Meter Analytics & Delivery Reports | Prepaid Energy Monitor",
    description:
      "Consumption trends, threshold crossings, SMS and USSD delivery success rates and retry counts for the prepaid energy meter simulation.",
    ogTitle: "Meter Analytics & Delivery Reports",
    ogDescription:
      "Selectable-range analytics for energy consumption, alert thresholds and GSM message delivery performance.",
  });
  const { session, loading } = useSession();
  const [days, setDays] = useState(7);

  const analytics = useQuery({
    queryKey: ["ops-analytics", days, session?.user.id ?? "anon"],
    queryFn: () => getOpsAnalytics({ days }),
    enabled: Boolean(session),
    refetchInterval: 30_000,
  });

  if (loading || (session && analytics.isLoading)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="label-caps">Compiling analytics…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm space-y-3 p-6 text-center">
          <p className="label-caps">Restricted</p>
          <h1 className="text-lg font-semibold">Sign in to view meter analytics</h1>
          <Button asChild>
            <Link to="/">Back to control room</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const data = analytics.data;
  const bucketLabel = days <= 1 ? "hour" : "day";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps">Reporting</p>
          <h1 className="text-2xl font-semibold">Analytics & delivery performance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "outline"}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
          <Button asChild variant="secondary" size="sm">
            <Link to="/">Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin">Admin</Link>
          </Button>
        </div>
      </header>

      {!data || data.consumption.readings === 0 ? (
        <Card className="p-6">
          <p className="label-caps">No telemetry in range</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start the simulation on the dashboard to accumulate readings, alerts and SMS deliveries,
            then return here.
          </p>
        </Card>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Energy consumed"
              value={data.consumption.totalEnergy.toFixed(3)}
              unit="kWh"
              hint={`NGN ${data.consumption.totalCost.toFixed(2)} at ${data.consumption.tariff.toFixed(0)}/kWh`}
            />
            <Kpi
              label="Peak load"
              value={(data.consumption.peakPower / 1000).toFixed(3)}
              unit="kW"
              hint={`Average ${(data.consumption.avgPower / 1000).toFixed(3)} kW`}
            />
            <Kpi
              label="SMS success rate"
              value={data.sms.successRate.toFixed(1)}
              unit="%"
              hint={`${data.sms.delivered} delivered · ${data.sms.failed} failed of ${data.sms.total}`}
            />
            <Kpi
              label="Avg retry count"
              value={data.sms.avgAttempts.toFixed(2)}
              unit="attempts"
              hint={`${data.sms.retried} retried · peak ${data.sms.maxAttempts}`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Consumption trend"
              subtitle={`Energy per ${bucketLabel} with estimated cost`}
            >
              <AreaChart data={data.buckets}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="energy"
                  name="kWh"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="NGN"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ChartCard>

            <ChartCard
              title="Load profile"
              subtitle={`Average and peak demand per ${bucketLabel} (W)`}
            >
              <LineChart data={data.buckets}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="avgPower"
                  name="Avg W"
                  stroke="var(--chart-3)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="peakPower"
                  name="Peak W"
                  stroke="var(--chart-5)"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ChartCard>

            <ChartCard title="Threshold crossings" subtitle={`Alerts raised per ${bucketLabel}`}>
              <BarChart data={data.buckets}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="alerts" name="Alerts" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Alerts by type" subtitle="Distribution of threshold events in range">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={data.crossings}
                  dataKey="count"
                  nameKey="type"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.crossings.map((entry, i) => (
                    <Cell key={entry.type} fill={SERIES[i % SERIES.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartCard>

            <ChartCard
              title="SMS retry pressure"
              subtitle={`Average attempts per ${bucketLabel} against delivery outcomes`}
            >
              <LineChart data={data.retryTrend}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="avgAttempts"
                  name="Avg attempts"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  name="Delivered"
                  stroke="var(--chart-4)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="Failed"
                  stroke="var(--chart-5)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ChartCard>

            <Card className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold">Channel delivery summary</h2>
                <p className="text-xs text-muted-foreground">
                  GSM SMS and USSD session outcomes for the selected range
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="label-caps">SMS</p>
                  {[
                    { label: "Delivered", value: data.sms.delivered, tone: "text-success" },
                    { label: "Sent (awaiting DLR)", value: data.sms.sent, tone: "" },
                    { label: "Failed", value: data.sms.failed, tone: "text-destructive" },
                    { label: "Queued / retrying", value: data.sms.pending, tone: "text-warning" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`digit ${row.tone}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="label-caps">USSD</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="digit">{data.ussd.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="digit text-success">{data.ussd.completed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Still active</span>
                    <span className="digit text-warning">{data.ussd.active}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion rate</span>
                    <span className="digit">{data.ussd.completionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.crossingsBySeverity.map((s) => (
                  <Badge key={s.severity} variant="outline">
                    {s.severity} · {s.count}
                  </Badge>
                ))}
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}
