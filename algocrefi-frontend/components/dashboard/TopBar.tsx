"use client";
import { useEffect, useState } from "react";

type TopMetric = {
  key: string;
  val: string;
  color?: string;
};

function syncedLabel(lastSyncedAt: number | null) {
  if (!lastSyncedAt) return "Last synced: --";
  const sec = Math.floor((Date.now() - lastSyncedAt) / 1000);
  if (sec < 3) return "Last synced: just now";
  if (sec < 60) return `Last synced: ${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `Last synced: ${min}m ago`;
}

export default function TopBar({
  title,
  routeLabel = "app.overview",
  refreshing = false,
  lastSyncedAt = null,
  metrics = [],
}: {
  title: string;
  routeLabel?: string;
  refreshing?: boolean;
  lastSyncedAt?: number | null;
  metrics?: TopMetric[];
}) {
  const [time, setTime] = useState("");
  const [block, setBlock] = useState(12847392);
  const [flashBlock, setFlashBlock] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const tTime = setInterval(tick, 1000);
    const tBlock = setInterval(() => {
      setBlock((p) => p + 1);
      setFlashBlock(true);
      setTimeout(() => setFlashBlock(false), 400);
    }, 3800);
    const tAgo = setInterval(() => setTick((p) => p + 1), 1000);
    return () => { clearInterval(tTime); clearInterval(tBlock); clearInterval(tAgo); };
  }, []);

  return (
    <div style={{ marginBottom: 28, flexShrink: 0 }}>
      {/* Top row: page identity + live indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        {/* Left: asymmetric title treatment */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <a
            href="/"
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 12,
              color: "rgba(0,255,209,0.75)",
              textDecoration: "none",
              border: "1px solid rgba(0,255,209,0.25)",
              borderRadius: 6,
              padding: "4px 8px",
              marginRight: 4,
            }}
          >
            ← Home
          </a>
          <h1
            className="font-display"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#F0F0F0",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {/* Slash separator + monospace route */}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.06em",
              paddingBottom: 2,
            }}
          >
            / {routeLabel}
          </span>
        </div>

        {/* Right: live ripple */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 3 }}>
          <div style={{ position: "relative", width: 10, height: 10 }}>
            {refreshing ? (
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid rgba(0,255,209,0.25)",
                  borderTopColor: "#00FFD1",
                  animation: "spin-topbar 0.7s linear infinite",
                }}
              />
            ) : (
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#00FFD1", boxShadow: "0 0 6px #00FFD1" }} />
            )}
          </div>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#00FFD1", letterSpacing: "0.12em" }}>
            {refreshing ? "SYNCING" : "LIVE"}
          </span>
          <span key={tick} style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {syncedLabel(lastSyncedAt)}
          </span>
        </div>
      </div>

      {/* Terminal status strip — the untraditional detail */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Block counter — left anchor */}
        <div
          style={{
            padding: "7px 14px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            BLK
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              color: flashBlock ? "#00FFD1" : "rgba(255,255,255,0.5)",
              letterSpacing: "0.06em",
              transition: "color 0.3s ease",
            }}
          >
            #{block.toLocaleString()}
          </span>
        </div>

        {/* Timestamp */}
        <div
          style={{
            padding: "7px 14px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
            {time}
          </span>
        </div>

        {/* Metrics — flex fill */}
        <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
          {metrics.map((m, i) => (
            <div
              key={m.key}
              style={{
                flex: 1,
                padding: "5px 10px",
                borderRight: i < metrics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>
                {m.key}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: m.color ?? "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.04em" }}>
                {m.val}
              </span>
            </div>
          ))}
        </div>

        {/* Right: network tag */}
        <div
          style={{
            padding: "7px 14px",
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#00FFD1", flexShrink: 0 }} />
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
            ALGORAND
          </span>
        </div>
      </div>

      <style>{`
        @keyframes live-ripple {
          0%   { transform:scale(1); opacity:0.6; }
          70%  { transform:scale(2.4); opacity:0; }
          100% { transform:scale(1); opacity:0; }
        }
        @keyframes spin-topbar {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
