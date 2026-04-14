"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SnapshotPoint = {
  time: number;
  value: number;
};

const STORAGE_KEY = "algocrefi_pool_balance_history_v1";
const MAX_POINTS = 800;
const LOOKBACK_OPTIONS = [
  { key: "1h", seconds: 3600 },
  { key: "6h", seconds: 6 * 3600 },
  { key: "24h", seconds: 24 * 3600 },
  { key: "7d", seconds: 7 * 24 * 3600 },
] as const;

type LookbackKey = (typeof LOOKBACK_OPTIONS)[number]["key"];

function loadStoredPoints() {
  if (typeof window === "undefined") return [] as SnapshotPoint[];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapshotPoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value));
  } catch {
    return [];
  }
}

function saveStoredPoints(points: SnapshotPoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points.slice(-MAX_POINTS)));
}

export default function PoolValueChart({ poolBalanceMicro }: { poolBalanceMicro: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const [lookback, setLookback] = useState<LookbackKey>("24h");
  const [points, setPoints] = useState<SnapshotPoint[]>([]);

  useEffect(() => {
    setPoints(loadStoredPoints());
  }, []);

  useEffect(() => {
    if (!Number.isFinite(poolBalanceMicro) || poolBalanceMicro < 0) return;

    const now = Math.floor(Date.now() / 1000);
    const value = poolBalanceMicro / 1_000_000;

    setPoints((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];

      if (last && now - last.time < 12) {
        last.value = value;
      } else {
        next.push({ time: now, value });
      }

      const pruned = next.slice(-MAX_POINTS);
      saveStoredPoints(pruned);
      return pruned;
    });
  }, [poolBalanceMicro]);

  const visiblePoints = useMemo(() => {
    const selected = LOOKBACK_OPTIONS.find((o) => o.key === lookback) ?? LOOKBACK_OPTIONS[2];
    const minTs = Math.floor(Date.now() / 1000) - selected.seconds;
    return points.filter((p) => p.time >= minTs);
  }, [lookback, points]);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;

    const setup = async () => {
      const { createChart, ColorType } = await import("lightweight-charts");
      if (!mounted || !containerRef.current) return;

      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "rgba(255,255,255,0.35)",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.05)" },
          horzLines: { color: "rgba(255,255,255,0.05)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      });

      const areaSeries = (chart as {
        addAreaSeries: (params: unknown) => { setData: (rows: unknown[]) => void };
      }).addAreaSeries({
        lineColor: "#00FFD1",
        topColor: "rgba(0,255,209,0.28)",
        bottomColor: "rgba(0,255,209,0.02)",
        lineWidth: 2,
      });

      areaSeries.setData(visiblePoints.map((p) => ({ time: p.time, value: p.value })));
      (chart as { timeScale: () => { fitContent: () => void } }).timeScale().fitContent();

      chartRef.current = chart;

      const ro = new ResizeObserver(() => {
        if (!containerRef.current || !chartRef.current) return;
        (chartRef.current as { applyOptions: (params: { width: number; height: number }) => void }).applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      });
      ro.observe(containerRef.current);

      return () => ro.disconnect();
    };

    const cleanupPromise = setup();
    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
        chartRef.current = null;
      }
    };
  }, [visiblePoints]);

  const latest = points[points.length - 1]?.value ?? 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>POOL TVL (ALGO)</div>
          <div className="font-display" style={{ fontSize: 30, color: "#F0F0F0", marginTop: 4 }}>
            {latest.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3, gap: 2 }}>
          {LOOKBACK_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setLookback(o.key)}
              style={{
                background: lookback === o.key ? "rgba(0,255,209,0.12)" : "transparent",
                color: lookback === o.key ? "#00FFD1" : "rgba(255,255,255,0.4)",
                border: "none",
                borderRadius: 6,
                padding: "5px 10px",
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {o.key}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", padding: "0 8px 8px" }}>
        {visiblePoints.length < 2 && (
          <div style={{ position: "absolute", inset: "0 8px 8px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
            Collecting pool history... keep dashboard open for live trend.
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%", opacity: visiblePoints.length < 2 ? 0.4 : 1 }} />
      </div>
    </div>
  );
}
