"use client";

const ROW1 = [
  { label: "ALGO/USDC", value: "0.31 USDC" },
  { label: "Total Pool", value: "54,030 ALGO" },
  { label: "App", value: "758675636" },
  { label: null, value: "Algorand Testnet" },
];

const ROW2 = [
  { label: "Active Loans", value: "2" },
  { label: "Min AURA", value: "30 pts" },
  { label: null, value: "ARC-4 Compliant" },
  { label: null, value: "Trustless · Permissionless" },
];

function TickerItem({ label, value }: { label: string | null; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <span style={{ color: "#00FFD1", fontSize: 10 }}>◆</span>
      {label && (
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}:</span>
      )}
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#F0F0F0" }}>{value}</span>
    </span>
  );
}

function TickerRow({ items, direction }: { items: typeof ROW1; direction: "left" | "right" }) {
  // Duplicate 4× for seamless infinite scroll
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div style={{ overflow: "hidden", height: 26, display: "flex", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          gap: 48,
          whiteSpace: "nowrap",
          animation: direction === "left"
            ? "marquee-left 35s linear infinite"
            : "marquee-right 35s linear infinite",
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
      <TickerRow items={ROW1} direction="left" />
      <TickerRow items={ROW2} direction="right" />
    </div>
  );
}
