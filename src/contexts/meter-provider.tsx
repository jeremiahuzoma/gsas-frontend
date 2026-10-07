import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { tokenStore } from "@/api/client";
import { getMeterState, meterStreamUrl } from "@/api/meter.api";
import type { MeterSnapshot, SimEvent } from "@/types/api";

interface MeterContextValue {
  snapshot: MeterSnapshot | null;
  events: SimEvent[];
  connected: boolean;
  loading: boolean;
  setSnapshot: (snapshot: MeterSnapshot | null) => void;
  pushEvent: (event: SimEvent) => void;
  refresh: () => Promise<void>;
}

const MeterContext = createContext<MeterContextValue | null>(null);

const MAX_EVENTS = 120;

export function MeterProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshotState] = useState<MeterSnapshot | null>(null);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const seenAlerts = useRef(new Set<string>());

  const pushEvent = useCallback((event: SimEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const setSnapshot = useCallback((next: MeterSnapshot | null) => {
    setSnapshotState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getMeterState();
      setSnapshotState(next);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const meterId = snapshot?.id;

  useEffect(() => {
    if (!meterId) return;
    let source: EventSource | null = null;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      const token = tokenStore.get();
      if (!token || cancelled) return;

      source = new EventSource(meterStreamUrl(meterId, token));

      source.addEventListener("open", () => setConnected(true));

      source.addEventListener("meter.updated", (evt) => {
        const next = JSON.parse((evt as MessageEvent).data) as MeterSnapshot;
        setSnapshotState(next);
        setConnected(true);
      });

      source.addEventListener("simulation.event", (evt) => {
        const simEvent = JSON.parse((evt as MessageEvent).data) as SimEvent;
        const key = `${simEvent.at}-${simEvent.message}`;
        if (seenAlerts.current.has(key)) return;
        seenAlerts.current.add(key);
        pushEvent(simEvent);
        if (simEvent.level === "warn" || simEvent.level === "error") {
          toast.warning(simEvent.message);
        } else if (simEvent.level === "success") {
          toast.success(simEvent.message);
        }
      });

      source.addEventListener("error", () => {
        setConnected(false);
        source?.close();
        if (!cancelled) retry = setTimeout(connect, 3000);
      });
    };

    void connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      source?.close();
      setConnected(false);
    };
  }, [meterId, pushEvent]);

  const value = useMemo<MeterContextValue>(
    () => ({ snapshot, events, connected, loading, setSnapshot, pushEvent, refresh }),
    [snapshot, events, connected, loading, setSnapshot, pushEvent, refresh],
  );

  return <MeterContext.Provider value={value}>{children}</MeterContext.Provider>;
}

export function useMeter() {
  const ctx = useContext(MeterContext);
  if (!ctx) throw new Error("useMeter must be used inside MeterProvider");
  return ctx;
}
