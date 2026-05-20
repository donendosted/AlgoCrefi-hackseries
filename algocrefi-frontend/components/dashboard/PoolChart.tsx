"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPoolHistory,
  fetchPoolSnapshot,
  type PoolSnapshot,
} from "@/src/utils/marketService";

const TIMEFRAMES = ["1h", "6h", "24h", "7d"] as const;
type TF = (typeof TIMEFRAMES)[number];

type LivePoint = {
  time: number;
  price: number;
  algoReserve: number;
  quoteReserve: number;
  round: number;
};

function formatUsdMetric(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

const LOOKBACK_SECONDS: Record<TF, number> = {
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
};

const LIVE_HISTORY_KEY = "algocrefi_live_pool_history_v1";
const MAX_LIVE_POINTS = 25000;

function loadLiveHistory(): LivePoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIVE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LivePoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) =>
      Number.isFinite(p.time) &&
      Number.isFinite(p.price) &&
      Number.isFinite(p.algoReserve) &&
      Number.isFinite(p.quoteReserve)
    );
  } catch {
    return [];
  }
}

function saveLiveHistory(points: LivePoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIVE_HISTORY_KEY, JSON.stringify(points.slice(-MAX_LIVE_POINTS)));
}

function mergeHistoryPoints(points: LivePoint[]) {
  const byTime = new Map<number, LivePoint>();
  for (const point of points) {
    if (!Number.isFinite(point.time) || !Number.isFinite(point.price) || point.price <= 0) continue;
    byTime.set(point.time, point);
  }
  return Array.from(byTime.values())
    .sort((a, b) => a.time - b.time)
    .slice(-MAX_LIVE_POINTS);
}

function groupLiveHistory(points: LivePoint[], lookback: TF) {
  const seconds = LOOKBACK_SECONDS[lookback];
  const minTs = Math.floor(Date.now() / 1000) - seconds;
  if (!points.length) return [];
  const firstInWindow = points.findIndex((p) => p.time >= minTs);
  const windowPoints =
    firstInWindow === -1
      ? [points[points.length - 1]]
      : firstInWindow === 0
        ? points
        : [points[firstInWindow - 1], ...points.slice(firstInWindow)];
  if (windowPoints.length === 0) return [];

  const interval =
    lookback === "1h" ? 30 : lookback === "6h" ? 120 : lookback === "24h" ? 300 : 1800;
  const buckets = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>();

  for (const point of windowPoints) {
    const bucketTime = Math.floor(point.time / interval) * interval;
    const existing = buckets.get(bucketTime);
    const volume = point.quoteReserve;

    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, point.price);
    existing.low = Math.min(existing.low, point.price);
    existing.close = point.price;
    existing.volume = Math.max(existing.volume, volume);
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .filter(
      (row) =>
        Number.isFinite(row.time) &&
        Number.isFinite(row.open) &&
        Number.isFinite(row.high) &&
        Number.isFinite(row.low) &&
        Number.isFinite(row.close)
    );
}

export default function PoolChart({ pair = "ALGO_USDC" }: { pair?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const candleSeriesRef = useRef<{ setData: (rows: unknown[]) => void } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [timeframe, setTimeframe] = useState<TF>("24h");
  const [history, setHistory] = useState<LivePoint[]>([]);
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);
  const [activityEvents, setActivityEvents] = useState<Array<{ txid: string; timestamp: number; priceHint?: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const pushSnapshot = useCallback((poolSnapshot: PoolSnapshot) => {
    setSnapshot(poolSnapshot);
    setHistory((prev) => {
      const next = [...prev];
      const now = Math.floor(Date.now() / 1000);
      const price = Number(poolSnapshot.usdcPerAlgo || 0);
      if (!Number.isFinite(price) || price <= 0) return prev;

      const last = next[next.length - 1];
      if (last && now - last.time < 2) {
        next[next.length - 1] = {
          ...last,
          time: now,
          price,
          algoReserve: poolSnapshot.algoReserve,
          quoteReserve: poolSnapshot.quoteReserve,
          round: poolSnapshot.round,
        };
      } else {
        next.push({
          time: now,
          price,
          algoReserve: poolSnapshot.algoReserve,
          quoteReserve: poolSnapshot.quoteReserve,
          round: poolSnapshot.round,
        });
      }
      const pruned = next.slice(-MAX_LIVE_POINTS);
      saveLiveHistory(pruned);
      return pruned;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = Math.floor(Date.now() / 1000);
        const [poolSnapshot, persisted] = await Promise.all([
          fetchPoolSnapshot(),
          fetchPoolHistory({ pair, fromTs: now - 7 * 24 * 3600, toTs: now, limit: 25000 }).catch(() => []),
        ]);
        if (cancelled) return;

        const merged = mergeHistoryPoints([...persisted, ...loadLiveHistory()]);
        setHistory(merged);
        saveLiveHistory(merged);
        pushSnapshot(poolSnapshot);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load market data");
        setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [pair, pushSnapshot]);

  useEffect(() => {
    const source = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://algocrefi-backend.onrender.com"}/api/market/pool-snapshot/stream`);

    source.onopen = () => {
      setError(null);
    };

    source.addEventListener("snapshot", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as PoolSnapshot;
        pushSnapshot(data);
      } catch {
        setError("Unable to parse live pool snapshot");
      }
    });

    source.addEventListener("activity", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { events?: Array<{ txid: string; timestamp: number; priceHint?: number | null }> };
        const events = Array.isArray(payload.events) ? payload.events : [];
        if (!events.length) return;
        setActivityEvents((prev) => {
          const seen = new Set(prev.map((e) => e.txid));
          const merged = [...events.filter((e) => e && e.txid && !seen.has(e.txid)), ...prev].slice(0, 100);
          return merged;
        });
      } catch {
        setError("Unable to parse live activity feed");
      }
    });

    source.onerror = () => {
      console.warn("Live pool stream reconnecting");
    };

    return () => {
      source.close();
    };
  }, [pushSnapshot]);

  useEffect(() => {
    if (!activityEvents.length || !snapshot?.usdcPerAlgo) return;
    setHistory((prev) => {
      const next = [...prev];
      for (const event of activityEvents.slice(0, 10)) {
        const bucketTime = Math.floor(Number(event.timestamp || Date.now() / 1000));
        const last = next[next.length - 1];
        const rawHint = Number(event.priceHint ?? NaN);
        const base = Number(snapshot.usdcPerAlgo || 0);
        const hasSaneHint = Number.isFinite(rawHint) && rawHint > 0 && base > 0 && rawHint >= base * 0.5 && rawHint <= base * 1.5;
        const price = hasSaneHint ? rawHint : base;
        if (!Number.isFinite(price) || price <= 0) continue;

        if (last && bucketTime - last.time < 2) {
          next[next.length - 1] = { ...last, time: bucketTime, price, algoReserve: last.algoReserve, quoteReserve: last.quoteReserve, round: last.round };
        } else {
          next.push({
            time: bucketTime,
            price,
            algoReserve: snapshot.algoReserve,
            quoteReserve: snapshot.quoteReserve,
            round: snapshot.round,
          });
        }
      }
      const pruned = next.slice(-MAX_LIVE_POINTS);
      saveLiveHistory(pruned);
      return pruned;
    });
  }, [activityEvents, snapshot?.usdcPerAlgo, snapshot?.algoReserve, snapshot?.quoteReserve, snapshot?.round]);

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
        watermark: {
          visible: false,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.05)" },
          horzLines: { color: "rgba(255,255,255,0.05)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      });

      const candleSeries = (chart as {
        addCandlestickSeries: (params: unknown) => { setData: (rows: unknown[]) => void };
      }).addCandlestickSeries({
        upColor: "#00FFD1",
        downColor: "#FF4444",
        wickUpColor: "#00FFD1",
        wickDownColor: "#FF4444",
        borderVisible: false,
      });

      candleSeriesRef.current = candleSeries;
      chartRef.current = chart;

      resizeObserverRef.current?.disconnect();
      const ro = new ResizeObserver(() => {
        if (!containerRef.current || !chartRef.current) return;
        (chartRef.current as { applyOptions: (params: { width: number; height: number }) => void }).applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      });
      resizeObserverRef.current = ro;
      ro.observe(containerRef.current);

      return () => ro.disconnect();
    };

    const cleanupPromise = setup();
    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const liveCandles = groupLiveHistory(history, timeframe);
    candleSeriesRef.current.setData(
      liveCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    if (chartRef.current) {
      const now = Math.floor(Date.now() / 1000);
      const from = now - LOOKBACK_SECONDS[timeframe];
      (
        chartRef.current as {
          timeScale: () => {
            setVisibleRange: (range: { from: number; to: number }) => void;
          };
        }
      )
        .timeScale()
        .setVisibleRange({ from, to: now });
    }
  }, [history, timeframe]);

  const currentPrice = useMemo(() => {
    if (!history.length) return null;
    return history[history.length - 1].price;
  }, [history]);

  const grouped = useMemo(() => groupLiveHistory(history, timeframe), [history, timeframe]);
  const latest = history[history.length - 1];
  const nowTs = Math.floor(Date.now() / 1000);
  const baselinePoint =
    [...history].reverse().find((point) => point.time <= nowTs - 24 * 60 * 60) ?? history[0];
  const basePrice = baselinePoint?.price ?? latest?.price ?? 0;
  const localChange24h = basePrice > 0 && latest ? ((latest.price - basePrice) / basePrice) * 100 : 0;
  const change24h = Number.isFinite(Number(snapshot?.priceChange24hPct))
    ? Number(snapshot?.priceChange24hPct)
    : localChange24h;
  const priceChangeColor = change24h >= 0 ? "#00FFD1" : "#FF4444";
  const localPoolLiquidity = latest ? latest.algoReserve * latest.price + latest.quoteReserve : 0;
  const localVolume24h = history.reduce((sum, point) => sum + point.quoteReserve, 0) / Math.max(history.length, 1);
  const poolLiquidity = Number(snapshot?.liquidityUsd) > 0 ? Number(snapshot?.liquidityUsd) : localPoolLiquidity;
  const volume24h = Number(snapshot?.volume24hUsd) > 0 ? Number(snapshot?.volume24hUsd) : localVolume24h;
  const low24h = grouped.length ? Math.min(...grouped.map((c) => c.low)) : latest?.price ?? 0;
  const high24h = grouped.length ? Math.max(...grouped.map((c) => c.high)) : latest?.price ?? 0;
  const displayPrice = snapshot?.usdcPerAlgo ?? currentPrice ?? 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#1f1f1f", color: "#f0f0f0" }}>
      <div
        style={{
          padding: "18px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0f0f0f", display: "grid", placeItems: "center", fontSize: 16, color: "#fff" }}>
              ⟠
            </div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#3b82f6", display: "grid", placeItems: "center", fontSize: 16, color: "#fff" }}>
              $
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
                {pair.replace("_", " / ")}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 20 }}>⇄</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!hidden && (
              <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3, gap: 2 }}>
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      background: timeframe === tf ? "rgba(0,255,209,0.12)" : "transparent",
                      color: timeframe === tf ? "#00FFD1" : "rgba(255,255,255,0.4)",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontFamily: "Inter,sans-serif",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setHidden((prev) => !prev)}
              style={{
                background: "#5a5a5a",
                color: "#e8e8e8",
                border: "none",
                borderRadius: 12,
                padding: "10px 16px",
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.03em",
                cursor: "pointer",
              }}
            >
              {hidden ? "SHOW" : "HIDE"}
            </button>
          </div>
        </div>

        {!hidden && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
              <div>
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>ALGO price</div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: "#e9eef7" }}>
                  {loading ? "--" : `$${displayPrice.toFixed(6)}`}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>24h Price Change</div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: priceChangeColor }}>
                  {history.length > 1 ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` : "--"}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>24h Volume</div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: "#e9eef7" }}>
                  {latest ? `$${formatUsdMetric(volume24h)}` : "--"}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Liquidity</div>
                <div style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 700, color: "#e9eef7" }}>
                  {latest ? `$${formatUsdMetric(poolLiquidity)}` : "--"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {snapshot
                ? `Tinyman Pool: ${snapshot.algoReserve.toFixed(2)} ALGO / ${snapshot.quoteReserve.toFixed(2)} ${snapshot.quoteSymbol}`
                : "Tinyman pool snapshot unavailable"}
            </div>
          </>
        )}
      </div>

      {!hidden && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "#232323",
            fontFamily: "Inter,sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <span style={{ color: "#e8e8e8" }}>D</span>
          <span style={{ opacity: 0.45 }}>|</span>
          <span style={{ letterSpacing: "0.02em" }}>Candles</span>
          <span style={{ opacity: 0.45 }}>|</span>
          <span style={{ letterSpacing: "0.02em" }}>Indicators</span>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.35)" }}>
            {loading ? "Loading..." : `Round ${snapshot?.round ?? latest?.round ?? "--"}`}
          </span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: "relative", padding: hidden ? "0" : "0 8px 8px" }}>
        {loading && (
          <div style={{ position: "absolute", inset: "0 8px 8px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
            Loading market data...
          </div>
        )}
        {error && !loading && (
          <div style={{ position: "absolute", inset: "0 8px 8px", display: "grid", placeItems: "center", color: "#FF7777", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
            {error}
          </div>
        )}
        {!error && !loading && grouped.length === 0 && (
          <div style={{ position: "absolute", inset: "0 8px 8px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
            Collecting live pool snapshots...
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%", opacity: loading ? 0.4 : 1, display: hidden ? "none" : "block" }} />
      </div>
    </div>
  );
}
