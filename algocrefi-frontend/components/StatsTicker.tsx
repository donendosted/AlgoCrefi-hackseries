"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPoolSnapshot } from "@/src/utils/marketService";
import { getPoolInfo } from "@/src/utils/poolService";

const APP_ID = "758675636";

const ROW2 = [
  { label: "Active Loans", value: "--" },
  { label: "Min AURA", value: "--" },
  { label: null, value: "ARC-4 Compliant" },
  { label: null, value: "Trustless | Permissionless" },
];

function TickerItem({ label, value }: { label: string | null; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <span style={{ color: "#00FFD1", fontSize: 10 }}>*</span>
      {label && (
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}:</span>
      )}
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#F0F0F0" }}>{value}</span>
    </span>
  );
}

function TickerRow({ items, direction }: { items: Array<{ label: string | null; value: string }>; direction: "left" | "right" }) {
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div style={{ overflow: "hidden", height: 26, display: "flex", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          gap: 48,
          whiteSpace: "nowrap",
          animation: direction === "left" ? "marquee-left 35s linear infinite" : "marquee-right 35s linear infinite",
          willChange: "transform",
        }}
      >
        {repeated.map((item, i) => (
          <TickerItem key={i} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}

export default function StatsTicker() {
  const [algoUsdc, setAlgoUsdc] = useState<string>("--");
  const [totalPool, setTotalPool] = useState<string>("--");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [snapshot, pool] = await Promise.all([fetchPoolSnapshot(), getPoolInfo()]);
        if (!alive) return;

        if (snapshot?.usdcPerAlgo && Number.isFinite(snapshot.usdcPerAlgo)) {
          setAlgoUsdc(`${snapshot.usdcPerAlgo.toFixed(4)} USDC`);
        }

        if (pool?.pool?.balance != null) {
          setTotalPool(`${(pool.pool.balance / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 4 })} ALGO`);
        }
      } catch {
        if (!alive) return;
      }
    };

    load();
    const id = setInterval(load, 10_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const row1 = useMemo(
    () => [
      { label: "ALGO/USDC", value: algoUsdc },
      { label: "Total Pool", value: totalPool },
      { label: "App", value: APP_ID },
      { label: null, value: "Algorand Testnet" },
    ],
    [algoUsdc, totalPool]
  );

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        overflow: "hidden",
        padding: "4px 0",
      }}
    >
      <TickerRow items={row1} direction="left" />
      <TickerRow items={ROW2} direction="right" />
    </div>
  );
}
