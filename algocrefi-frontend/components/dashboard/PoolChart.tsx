"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMarketStats,
  fetchOHLC,
  fetchPoolSnapshot,
  type MarketStats,
  type OHLCCandle,
  type PoolSnapshot,
} from "@/src/utils/marketService";

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"] as const;
type TF = (typeof TIMEFRAMES)[number];

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function PoolChart({ pair = "ALGO_USDC" }: { pair?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const [timeframe, setTimeframe] = useState<TF>("1h");
  const [candles, setCandles] = useState<OHLCCandle[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async (tf: TF) => {
    setError(null);
    const [ohlc, marketStats, poolSnapshot] = await Promise.all([
      fetchOHLC(tf, pair),
      fetchMarketStats(pair),
      fetchPoolSnapshot(),
    ]);
    setCandles(ohlc);
    setStats(marketStats);
    setSnapshot(poolSnapshot);
    setLoading(false);
  }, [pair]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMarket(timeframe).catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "Unable to load market data");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [timeframe, loadMarket]);

  useEffect(() => {
    const id = setInterval(() => {
      loadMarket(timeframe).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to refresh market data");
      });
    }, 30000);
    return () => clearInterval(id);
  }, [timeframe, loadMarket]);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;
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

      const candleSeries = (chart as {
        addCandlestickSeries: (params: unknown) => { setData: (rows: unknown[]) => void };
      }).addCandlestickSeries({
        upColor: "#00FFD1",
        downColor: "#FF4444",
        wickUpColor: "#00FFD1",
        wickDownColor: "#FF4444",
        borderVisible: false,
      });

      const volumeSeries = (chart as {
        addHistogramSeries: (params: unknown) => { setData: (rows: unknown[]) => void };
      }).addHistogramSeries({
        priceScaleId: "",
        priceFormat: { type: "volume" },
        scaleMargins: { top: 0.82, bottom: 0 },
      });

      candleSeries.setData(candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
      volumeSeries.setData(candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(0,255,209,0.35)" : "rgba(255,68,68,0.35)",
      })));

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
  }, [candles]);

  const currentPrice = useMemo(() => {
    if (stats) return stats.price;
    if (!candles.length) return null;
    return candles[candles.length - 1].close;
  }, [stats, candles]);

  const changeColor = (stats?.change24h ?? 0) >= 0 ? "#00FFD1" : "#FF4444";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{pair.replace("_", " / ")}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <span className="font-display" style={{ fontSize: 30, color: "#F0F0F0" }}>
              {loading ? "--" : (snapshot?.usdcPerAlgo ?? currentPrice)?.toFixed(4) ?? "--"}
            </span>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: changeColor }}>
              {stats ? `${stats.change24h >= 0 ? "+" : ""}${stats.change24h.toFixed(2)}%` : "--"}
            </span>
          </div>
          <div style={{ marginTop: 4, fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            {snapshot
              ? `Tinyman Pool: ${snapshot.algoReserve.toFixed(2)} ALGO / ${snapshot.quoteReserve.toFixed(2)} ${snapshot.quoteSymbol}`
              : "Tinyman pool snapshot unavailable"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, textAlign: "right" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.28)" }}>24H VOL</div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#F0F0F0" }}>{stats ? formatCompact(stats.volume24h) : "--"}</div>
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.28)" }}>LIQUIDITY</div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#F0F0F0" }}>{stats ? formatCompact(stats.liquidity) : "--"}</div>
          </div>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.28)" }}>24H RANGE</div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#F0F0F0" }}>
              {stats ? `${stats.low24h.toFixed(4)} - ${stats.high24h.toFixed(4)}` : "--"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 12px" }}>
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
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", padding: "0 8px 8px" }}>
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
        {!error && !loading && candles.length === 0 && (
          <div style={{ position: "absolute", inset: "0 8px 8px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Inter,sans-serif", fontSize: 13 }}>
            No market history available yet.
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%", opacity: loading ? 0.4 : 1 }} />
      </div>
    </div>
  );
}
