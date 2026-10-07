import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  addApplianceToMeter,
  applyMeterConfiguration,
  deleteMeterConfiguration,
  listAppliances,
  listMeterConfigurations,
  removeApplianceFromMeter,
  replaceMeterAppliances,
  saveMeterConfiguration,
  setApplianceState,
  setDefaultConfiguration,
} from "@/api/appliance.api";
import type { MeterSnapshot } from "@/types/api";

type ConnectedAppliance = MeterSnapshot["appliances"][number];

/**
 * Appliance rig builder.
 *
 * Appliances are dragged from the catalogue onto the busbar to connect them,
 * dragged back to the catalogue to disconnect, and reordered inside the busbar.
 * The resulting rig can be saved as a named configuration and one configuration
 * per meter can be marked as default, which is replayed on simulation reset.
 */
export function ApplianceBench({
  snapshot,
  onChanged,
}: {
  snapshot: MeterSnapshot;
  onChanged: () => Promise<void> | void;
}) {
  const meterId = snapshot.id;
  const [dragging, setDragging] = useState<
    { source: "catalog"; applianceId: string } | { source: "bus"; index: number } | null
  >(null);
  const [overBus, setOverBus] = useState(false);
  const [configName, setConfigName] = useState("");
  const [busy, setBusy] = useState(false);

  const catalog = useQuery({ queryKey: ["appliances"], queryFn: () => listAppliances() });
  const configs = useQuery({
    queryKey: ["meter-configurations", meterId],
    queryFn: () => listMeterConfigurations({ meterId }),
  });

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
      await configs.refetch();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
      setDragging(null);
      setOverBus(false);
    }
  };

  const connected = snapshot.appliances;

  const dropOnBus = async () => {
    if (!dragging) return;
    if (dragging.source === "catalog") {
      await run(() => addApplianceToMeter({ meterId, applianceId: dragging.applianceId }));
    } else {
      setDragging(null);
      setOverBus(false);
    }
  };

  const reorder = async (from: number, to: number) => {
    if (from === to) return;
    const next = [...connected];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    await run(() =>
      replaceMeterAppliances({
        meterId,
        items: next.map((a) => ({ applianceId: a.applianceId, isOn: a.isOn })),
      }),
    );
  };

  const disconnect = (a: ConnectedAppliance) =>
    run(() => removeApplianceFromMeter({ meterId, linkId: a.id }));

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Appliance rig</h2>
          <p className="label-caps">Drag loads onto the busbar · {connected.length} connected</p>
        </div>
        <Badge variant="outline">{(snapshot.powerWatts / 1000).toFixed(3)} kW total</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
        {/* Catalogue */}
        <div
          className="space-y-2 rounded-md border border-dashed border-border p-2"
          onDragOver={(e) => {
            if (dragging?.source === "bus") e.preventDefault();
          }}
          onDrop={() => {
            if (dragging?.source === "bus") {
              const a = connected[dragging.index];
              if (a) void disconnect(a);
            }
          }}
        >
          <p className="label-caps">Appliance catalogue</p>
          {(catalog.data ?? []).map((a) => (
            <div
              key={a.id}
              draggable={!busy}
              onDragStart={() => setDragging({ source: "catalog", applianceId: a.id })}
              onDragEnd={() => setDragging(null)}
              onDoubleClick={() =>
                void run(() => addApplianceToMeter({ meterId, applianceId: a.id }))
              }
              className="flex cursor-grab items-center justify-between rounded-md border border-border bg-panel px-3 py-2 active:cursor-grabbing"
              title="Drag onto the busbar, or double-click to connect"
            >
              <span className="text-sm font-medium">
                {a.icon} {a.name}
              </span>
              <span className="label-caps">{Number(a.rated_power)} W</span>
            </div>
          ))}
          {catalog.isLoading && <p className="text-sm text-muted-foreground">Loading catalogue…</p>}
        </div>

        {/* Busbar */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOverBus(true);
          }}
          onDragLeave={() => setOverBus(false)}
          onDrop={() => void dropOnBus()}
          className={`min-h-40 space-y-2 rounded-md border-2 border-dashed p-2 transition-colors ${
            overBus ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="label-caps">Meter busbar</p>
          {connected.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Drop appliances here to connect them to the meter.
            </p>
          )}
          {connected.map((a, index) => (
            <div
              key={a.id}
              draggable={!busy}
              onDragStart={() => setDragging({ source: "bus", index })}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                if (dragging?.source === "bus") void reorder(dragging.index, index);
                else void dropOnBus();
              }}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-panel px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {a.icon} {a.name}
                </p>
                <p className="label-caps">
                  {a.ratedPower} W rated · {a.currentPower.toFixed(0)} W now ·{" "}
                  {a.energyKwh.toFixed(3)} kWh
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={a.isOn}
                  onCheckedChange={(next) =>
                    run(() => setApplianceState({ meterId, linkId: a.id, isOn: next }))
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Disconnect ${a.name}`}
                  onClick={() => void disconnect(a)}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved configurations */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="label-caps">Saved configurations</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={configName}
            placeholder="Configuration name, e.g. Evening peak"
            onChange={(e) => setConfigName(e.target.value)}
            className="max-w-60"
          />
          <Button
            size="sm"
            disabled={busy || configName.trim().length < 2}
            onClick={() =>
              void run(
                () => saveMeterConfiguration({ meterId, name: configName.trim() }),
                "Configuration saved",
              )
            }
          >
            Save rig
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || configName.trim().length < 2}
            onClick={() =>
              void run(
                () =>
                  saveMeterConfiguration({ meterId, name: configName.trim(), makeDefault: true }),
                "Saved as the default rig",
              )
            }
          >
            Save as default
          </Button>
        </div>

        <ul className="space-y-2">
          {(configs.data ?? []).map((c) => {
            const items = (c.items ?? []) as Array<{ applianceId: string }>;
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {c.name}{" "}
                  {c.is_default && (
                    <Badge variant="default" className="ml-1">
                      DEFAULT
                    </Badge>
                  )}
                  <span className="label-caps ml-2">{items.length} loads</span>
                </span>
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => applyMeterConfiguration({ meterId, configurationId: c.id }),
                        `Applied “${c.name}”`,
                      )
                    }
                  >
                    Apply
                  </Button>
                  {!c.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => setDefaultConfiguration({ meterId, configurationId: c.id }),
                          "Default configuration updated",
                        )
                      }
                    >
                      Make default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => deleteMeterConfiguration({ meterId, configurationId: c.id }),
                        "Configuration deleted",
                      )
                    }
                  >
                    Delete
                  </Button>
                </span>
              </li>
            );
          })}
          {(configs.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">
              No saved configurations yet. Build a rig and save it for your defence run.
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
