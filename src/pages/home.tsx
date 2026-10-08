import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useSession } from "@/hooks/use-session";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { MeterProvider, useMeter } from "@/contexts/meter-provider";
import { ApplianceBench } from "@/components/appliance-bench";
import {
  controlSimulation,
  rechargeMeter,
  setSimulationSpeed,
  forceThreshold,
} from "@/api/meter.api";

export default function Home() {
  useDocumentMeta({
    title: "GSM Prepaid Energy Meter Monitor | Live Dashboard",
    description:
      "Live SCADA-style dashboard for a simulated prepaid energy meter with GSM SMS low-balance alerts and USSD balance queries.",
    ogTitle: "GSM Prepaid Energy Meter Monitor",
    ogDescription:
      "Real-time prepaid energy meter simulation with EbulkSMS threshold alerts and Africa's Talking USSD.",
  });
  const { session, loading } = useSession();
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="label-caps">Initialising control room…</p>
      </main>
    );
  }
  if (!session) return <AuthGate />;
  return (
    <MeterProvider>
      <Dashboard />
    </MeterProvider>
  );
}

function AuthGate() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (mode: "in" | "up") => {
    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else {
        await signUp(email, password);
        toast.success("Account created — you can sign in now.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="label-caps">GSM Prepaid Energy Meter</p>
          <h1 className="text-xl font-semibold">Operator sign in</h1>
        </div>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => submit("in")}>
            Sign in
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => submit("up")}>
            Sign up
          </Button>
        </div>
      </Card>
    </main>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card className="p-4">
      <p className="label-caps">{label}</p>
      <p className="digit mt-1 text-2xl font-semibold text-primary">
        {value}
        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
      </p>
    </Card>
  );
}

function Dashboard() {
  const { snapshot, events, connected, refresh } = useMeter();
  const { signOut } = useAuth();
  const [amount, setAmount] = useState("20");

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="label-caps">Loading meter telemetry…</p>
      </main>
    );
  }

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps">Meter {snapshot.meterNumber}</p>
          <h1 className="text-2xl font-semibold">{snapshot.customerName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "LIVE" : "OFFLINE"}
          </Badge>
          <Badge variant="outline">{snapshot.status}</Badge>
          <Badge variant="outline">GSM {snapshot.gsm}</Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin">Admin</Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Balance" value={snapshot.balanceKwh.toFixed(2)} unit="kWh" />
        <Metric label="Active load" value={(snapshot.powerWatts / 1000).toFixed(3)} unit="kW" />
        <Metric label="Voltage" value={snapshot.voltage.toFixed(1)} unit="V" />
        <Metric label="Current" value={snapshot.currentAmps.toFixed(2)} unit="A" />
        <Metric label="Power factor" value={snapshot.powerFactor.toFixed(2)} unit="" />
        <Metric label="Frequency" value={snapshot.frequencyHz.toFixed(2)} unit="Hz" />
        <Metric label="Consumed" value={snapshot.totalConsumedKwh.toFixed(3)} unit="kWh" />
        <Card className="p-4">
          <p className="label-caps">Time remaining</p>
          <p className="digit mt-1 text-2xl font-semibold">{snapshot.estimatedRemaining}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ApplianceBench snapshot={snapshot} onChanged={refresh} />

        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Simulation control</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  act(() =>
                    controlSimulation({
                      meterId: snapshot.id,
                      action: snapshot.simulationRunning ? "pause" : "start",
                    }),
                  )
                }
              >
                {snapshot.simulationRunning ? "Pause" : "Start"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  act(() => controlSimulation({ meterId: snapshot.id, action: "reset" }))
                }
              >
                Reset
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 10, 60, 300, 600].map((speed) => (
                <Button
                  key={speed}
                  size="sm"
                  variant={snapshot.simulationSpeed === speed ? "default" : "outline"}
                  onClick={() => act(() => setSimulationSpeed({ meterId: snapshot.id, speed }))}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Recharge</h2>
            <div className="flex gap-2">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button
                onClick={() =>
                  act(() => rechargeMeter({ meterId: snapshot.id, amountKwh: Number(amount) || 1 }))
                }
              >
                Top up
              </Button>
            </div>
            <p className="label-caps">
              Tariff NGN {snapshot.tariffPerKwh.toFixed(2)} / kWh · thresholds{" "}
              {snapshot.thresholds.low}/{snapshot.thresholds.critical}/{snapshot.thresholds.urgent}{" "}
              kWh
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Low", value: snapshot.thresholds.low - 0.1 },
                { label: "Critical", value: snapshot.thresholds.critical - 0.1 },
                { label: "Urgent", value: snapshot.thresholds.urgent - 0.1 },
                { label: "Depleted", value: 0 },
              ].map((t) => (
                <Button
                  key={t.label}
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    act(() =>
                      forceThreshold({ meterId: snapshot.id, balance: Math.max(0, t.value) }),
                    )
                  }
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Event log</h2>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {events.length === 0 && (
            <li className="text-sm text-muted-foreground">No simulation events yet.</li>
          )}
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="digit text-xs">
              <span className="text-muted-foreground">
                {new Date(e.at).toLocaleTimeString("en-GB")}
              </span>{" "}
              <span
                className={
                  e.level === "error"
                    ? "text-destructive"
                    : e.level === "warn"
                      ? "text-warning"
                      : e.level === "success"
                        ? "text-success"
                        : "text-foreground"
                }
              >
                {e.message}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
