import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import {
  adminDeleteAppliance,
  adminListMeters,
  adminListSmsLogs,
  adminListTemplates,
  adminListWebhookEvents,
  adminRetrySms,
  adminSaveAppliance,
  adminSaveTemplate,
  adminUpdateMeter,
  claimAdmin,
  getAdminContext,
} from "@/api/admin.api";
import { listAppliances } from "@/api/appliance.api";
import type { AdminMeterRow } from "@/types/api";

export default function AdminPage() {
  useDocumentMeta({
    title: "Meter Administration | GSM Prepaid Energy Monitor",
    description:
      "Administrative console for prepaid meters, customer records, alert thresholds, appliance library and SMS/USSD delivery logs.",
    ogTitle: "Meter Administration Console",
    ogDescription:
      "Manage meters, customers, thresholds, notification templates and SMS delivery logs for the prepaid energy monitoring system.",
  });
  const { session, loading } = useSession();
  const admin = useQuery({
    queryKey: ["admin-context", session?.user.id ?? "anon"],
    queryFn: () => getAdminContext(),
    enabled: Boolean(session),
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="label-caps">Checking credentials…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="space-y-3 p-6 text-center">
          <h1 className="text-xl font-semibold">Administration</h1>
          <p className="text-sm text-muted-foreground">
            Sign in on the dashboard first, then return to this console.
          </p>
          <Button asChild>
            <Link to="/">Go to dashboard</Link>
          </Button>
        </Card>
      </main>
    );
  }

  if (admin.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="label-caps">Verifying administrator role…</p>
      </main>
    );
  }

  if (!admin.data?.isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="space-y-3 p-6 text-center">
          <h1 className="text-xl font-semibold">Administrator access required</h1>
          <p className="text-sm text-muted-foreground">
            If this is a fresh deployment, the first signed-in account may claim the administrator
            role.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={async () => {
                try {
                  const res = await claimAdmin();
                  if (res.granted) {
                    toast.success("Administrator role granted");
                    await admin.refetch();
                  } else {
                    toast.error("An administrator already exists for this deployment");
                  }
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not claim the role");
                }
              }}
            >
              Claim administrator role
            </Button>
            <Button asChild variant="secondary">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps">Control room</p>
          <h1 className="text-2xl font-semibold">Administration console</h1>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/">Live dashboard</Link>
        </Button>
      </header>

      <Tabs defaultValue="meters">
        <TabsList>
          <TabsTrigger value="meters">Meters &amp; customers</TabsTrigger>
          <TabsTrigger value="appliances">Appliance library</TabsTrigger>
          <TabsTrigger value="templates">Message templates</TabsTrigger>
          <TabsTrigger value="comms">SMS &amp; webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="meters" className="mt-4">
          <MetersPanel />
        </TabsContent>
        <TabsContent value="appliances" className="mt-4">
          <AppliancesPanel />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesPanel />
        </TabsContent>
        <TabsContent value="comms" className="mt-4">
          <CommsPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

/* ----------------------------- Meters ----------------------------- */

function MetersPanel() {
  const meters = useQuery({ queryKey: ["admin-meters"], queryFn: () => adminListMeters() });
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {(meters.data ?? []).map((m) => (
        <Card key={m.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-caps">Meter {m.meter_number}</p>
              <h2 className="font-semibold">{m.customer_name}</h2>
              <p className="label-caps">{m.phone_number ?? "no phone number on record"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{m.status}</Badge>
              <Badge variant="outline">GSM {m.gsm}</Badge>
              <Badge variant="secondary" className="digit">
                {Number(m.balance_kwh).toFixed(2)} kWh
              </Badge>
              <Button
                size="sm"
                variant={editing === m.id ? "secondary" : "outline"}
                onClick={() => setEditing(editing === m.id ? null : m.id)}
              >
                {editing === m.id ? "Close" : "Edit"}
              </Button>
            </div>
          </div>

          {editing === m.id && (
            <MeterEditor
              meter={m}
              onSaved={async () => {
                await meters.refetch();
                setEditing(null);
              }}
            />
          )}
        </Card>
      ))}
      {meters.isLoading && <p className="label-caps">Loading meters…</p>}
      {!meters.isLoading && (meters.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No meters registered yet.</p>
      )}
    </div>
  );
}

type AdminMeter = AdminMeterRow;

function MeterEditor({ meter, onSaved }: { meter: AdminMeter; onSaved: () => void }) {
  const [form, setForm] = useState({
    customerName: meter.customer_name,
    phoneNumber: meter.phone_number ?? "",
    tariff: String(meter.tariff_per_kwh),
    low: String(meter.low_threshold),
    critical: String(meter.critical_threshold),
    urgent: String(meter.urgent_threshold),
  });
  const [busy, setBusy] = useState(false);

  const save = async (extra?: {
    gsm?: "CONNECTED" | "WEAK" | "DISCONNECTED";
    status?: "ACTIVE" | "INACTIVE";
  }) => {
    setBusy(true);
    try {
      await adminUpdateMeter({
        meterId: meter.id,
        customerName: form.customerName,
        ...(form.phoneNumber ? { phoneNumber: form.phoneNumber } : {}),
        tariff: Number(form.tariff),
        low: Number(form.low),
        critical: Number(form.critical),
        urgent: Number(form.urgent),
        ...extra,
      });
      toast.success("Meter updated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string) => (
    <label className="space-y-1">
      <span className="label-caps">{label}</span>
      <Input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field("customerName", "Customer name")}
        {field("phoneNumber", "Alert phone number")}
        {field("tariff", "Tariff (NGN / kWh)")}
        {field("low", "Low threshold (kWh)")}
        {field("critical", "Critical threshold (kWh)")}
        {field("urgent", "Urgent threshold (kWh)")}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void save()}>
          Save changes
        </Button>
        {(["CONNECTED", "WEAK", "DISCONNECTED"] as const).map((gsm) => (
          <Button
            key={gsm}
            size="sm"
            variant={meter.gsm === gsm ? "default" : "outline"}
            disabled={busy}
            onClick={() => void save({ gsm })}
          >
            GSM {gsm}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Appliances --------------------------- */

const emptyAppliance = {
  id: undefined as string | undefined,
  name: "",
  category: "General",
  icon: "🔌",
  ratedPower: "100",
  idlePower: "0",
  usageProfile: "CONSTANT" as "CONSTANT" | "CYCLIC" | "INTERMITTENT",
  dutyCycle: "1",
  cycleSeconds: "600",
  powerFactor: "0.95",
};

function AppliancesPanel() {
  const appliances = useQuery({ queryKey: ["appliances"], queryFn: () => listAppliances() });
  const [form, setForm] = useState(emptyAppliance);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminSaveAppliance({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        category: form.category,
        icon: form.icon,
        ratedPower: Number(form.ratedPower),
        idlePower: Number(form.idlePower),
        usageProfile: form.usageProfile,
        dutyCycle: Number(form.dutyCycle),
        cycleSeconds: Number(form.cycleSeconds),
        powerFactor: Number(form.powerFactor),
      });
      toast.success("Appliance saved");
      setForm(emptyAppliance);
      await appliances.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save appliance");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Appliance library</h2>
        <ul className="space-y-2">
          {(appliances.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {a.icon} {a.name}
                </p>
                <p className="label-caps">
                  {a.category} · {Number(a.rated_power)} W · {a.usage_profile} · PF{" "}
                  {Number(a.power_factor)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      id: a.id,
                      name: a.name,
                      category: a.category,
                      icon: a.icon,
                      ratedPower: String(a.rated_power),
                      idlePower: String(a.idle_power),
                      usageProfile: a.usage_profile,
                      dutyCycle: String(a.duty_cycle),
                      cycleSeconds: String(a.cycle_seconds),
                      powerFactor: String(a.power_factor),
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await adminDeleteAppliance({ id: a.id });
                      toast.success("Appliance removed");
                      await appliances.refetch();
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not remove appliance",
                      );
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{form.id ? "Edit appliance" : "Add appliance"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Name"],
              ["category", "Category"],
              ["icon", "Icon"],
              ["ratedPower", "Rated power (W)"],
              ["idlePower", "Idle power (W)"],
              ["dutyCycle", "Duty cycle (0-1)"],
              ["cycleSeconds", "Cycle length (s)"],
              ["powerFactor", "Power factor"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="label-caps">{label}</span>
              <Input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["CONSTANT", "CYCLIC", "INTERMITTENT"] as const).map((profile) => (
            <Button
              key={profile}
              size="sm"
              variant={form.usageProfile === profile ? "default" : "outline"}
              onClick={() => setForm((f) => ({ ...f, usageProfile: profile }))}
            >
              {profile}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button disabled={busy || form.name.trim().length < 2} onClick={() => void save()}>
            {form.id ? "Save appliance" : "Add appliance"}
          </Button>
          {form.id && (
            <Button variant="secondary" onClick={() => setForm(emptyAppliance)}>
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* --------------------------- Templates ---------------------------- */

function TemplatesPanel() {
  const templates = useQuery({
    queryKey: ["admin-templates"],
    queryFn: () => adminListTemplates(),
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newBody, setNewBody] = useState("");

  const save = async (key: string, body: string) => {
    try {
      await adminSaveTemplate({ key, body });
      toast.success(`${key} saved`);
      await templates.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Placeholders</h2>
        <p className="text-sm text-muted-foreground">
          Use {"{{customerName}}"}, {"{{meterNumber}}"}, {"{{balance}}"},{" "}
          {"{{estimatedRemainingTime}}"} and {"{{currentLoad}}"} inside SMS bodies. Keys{" "}
          <span className="digit">USSD_WELCOME</span> and{" "}
          <span className="digit">USSD_NOT_REGISTERED</span> control the USSD menu text.
        </p>
      </Card>

      {(templates.data ?? []).map((t) => (
        <Card key={t.id} className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <p className="label-caps">{t.key}</p>
            <span className="label-caps">
              updated {new Date(t.updated_at).toLocaleString("en-GB")}
            </span>
          </div>
          <Textarea
            rows={3}
            value={drafts[t.key] ?? t.body}
            onChange={(e) => setDrafts((d) => ({ ...d, [t.key]: e.target.value }))}
          />
          <Button size="sm" onClick={() => void save(t.key, drafts[t.key] ?? t.body)}>
            Save template
          </Button>
        </Card>
      ))}

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Add template</h2>
        <Input
          placeholder="TEMPLATE_KEY"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
        />
        <Textarea
          rows={3}
          placeholder="Message body"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
        />
        <Button
          size="sm"
          disabled={newKey.length < 3 || newBody.length < 5}
          onClick={async () => {
            await save(newKey, newBody);
            setNewKey("");
            setNewBody("");
          }}
        >
          Create template
        </Button>
      </Card>
    </div>
  );
}

/* ------------------------------ Comms ----------------------------- */

function CommsPanel() {
  const logs = useQuery({
    queryKey: ["admin-sms-logs"],
    queryFn: () => adminListSmsLogs({ limit: 60 }),
  });
  const hooks = useQuery({
    queryKey: ["admin-webhook-events"],
    queryFn: () => adminListWebhookEvents(),
  });
  const [busy, setBusy] = useState(false);

  const retry = async (logId?: string) => {
    setBusy(true);
    try {
      const summary = await adminRetrySms(logId ? { logId } : {});
      toast.success(
        `Retry run: ${summary.sent} sent, ${summary.failed} failed of ${summary.scanned} scanned`,
      );
      await logs.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">SMS delivery log</h2>
          <Button size="sm" disabled={busy} onClick={() => void retry()}>
            Run retry worker
          </Button>
        </div>
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {(logs.data ?? []).map((l) => (
            <li key={l.id} className="rounded-md border border-border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="digit text-xs">{l.phone_number}</span>
                <span className="flex items-center gap-2">
                  <Badge
                    variant={
                      l.status === "DELIVERED" || l.status === "SENT"
                        ? "default"
                        : l.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {l.status}
                  </Badge>
                  <span className="label-caps">attempt {l.attempts ?? 0}</span>
                  {(l.status === "FAILED" || l.status === "RETRY_SCHEDULED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void retry(l.id)}
                    >
                      Resend
                    </Button>
                  )}
                </span>
              </div>
              <p className="mt-1 text-sm">{l.message}</p>
              <p className="label-caps">
                {new Date(l.created_at).toLocaleString("en-GB")}
                {l.failure_reason ? ` · ${l.failure_reason}` : ""}
                {l.next_attempt_at
                  ? ` · retry at ${new Date(l.next_attempt_at).toLocaleTimeString("en-GB")}`
                  : ""}
              </p>
            </li>
          ))}
          {(logs.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">No SMS activity recorded yet.</li>
          )}
        </ul>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Inbound webhook events</h2>
        <p className="label-caps">
          Duplicate callbacks are recorded once — provider retries replay the stored response.
        </p>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {(hooks.data ?? []).map((h) => (
            <li key={h.id} className="digit text-xs">
              <span className="text-muted-foreground">
                {new Date(h.created_at).toLocaleTimeString("en-GB")}
              </span>{" "}
              {h.event_type} · {h.external_id} ·{" "}
              <span className={h.status === "PROCESSED" ? "text-success" : "text-destructive"}>
                {h.status}
              </span>{" "}
              {h.signature_verified ? "· signed" : "· unsigned"}
            </li>
          ))}
          {(hooks.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">No webhook callbacks received yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
