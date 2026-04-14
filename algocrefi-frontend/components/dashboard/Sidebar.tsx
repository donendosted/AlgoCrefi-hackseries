"use client";
import { useState, useEffect } from "react";
import { disconnectWallet, getStoredWalletType, truncateAddress } from "@/src/utils/walletService";
import { getWalletAddress, logout } from "@/src/utils/authService";

const NAV = [
  {
    id: "dashboard",
    label: "Overview",
    tag: "01",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: "pool",
    label: "Pool",
    tag: "02",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2C7 2 2 5.5 2 8.5a5 5 0 0010 0C12 5.5 7 2 7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "lending",
    label: "Lending",
    tag: "03",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="6" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.5 6V4.5a3.5 3.5 0 017 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "aura",
    label: "Aura",
    tag: "04",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <polygon points="7,1 8.8,5 13,5.6 10,8.4 10.8,12.5 7,10.5 3.2,12.5 4,8.4 1,5.6 5.2,5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    tag: "05",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M2.6 11.4l1-1M10.4 3.6l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
}

export default function Sidebar({ active, onNav }: SidebarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [txCount, setTxCount] = useState(2847);
  const [mounted, setMounted] = useState(false);
  const [walletAddress, setWalletAddress] = useState("ALGO3X...F9KT");

  useEffect(() => {
    const addr = getWalletAddress();
    if (addr) {
      setWalletAddress(truncateAddress(addr));
    }
  }, []);

  const handleDisconnect = async () => {
    try {
      const walletType = getStoredWalletType();
      if (walletType) {
        await disconnectWallet(walletType);
      }
    } catch {
      // continue with logout even if wallet SDK disconnect fails
    }
    logout();
  };

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTxCount((p) => p + Math.floor(Math.random() * 3)), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <aside
      data-sidebar="root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 220,
        height: "100vh",
        background: "rgba(5,5,12,0.92)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: "linear-gradient(90deg, #00FFD1, #7B2FFF, transparent)", flexShrink: 0 }} />

      {/* Logo block */}
      <div style={{ padding: "20px 20px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#F0F0F0", letterSpacing: "-0.04em" }}>Algo</span>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#00FFD1", letterSpacing: "-0.04em" }}>Crefi</span>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(0,255,209,0.3)", letterSpacing: "0.15em", marginTop: 3 }}>
          ● TESTNET LIVE
        </div>
      </div>

      {/* Wallet chip — untraditional: full-width, terminal style */}
      <div style={{ padding: "0 14px 16px", flexShrink: 0 }}>
        <div
          style={{
            background: "rgba(0,255,209,0.04)",
            border: "1px solid rgba(0,255,209,0.1)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(0,255,209,0.4)", letterSpacing: "0.12em" }}>CONNECTED</span>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#00FFD1",
                boxShadow: "0 0 6px #00FFD1",
                animation: "dot-pulse 2s ease infinite",
              }}
            />
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}>
            {walletAddress}
          </div>
        </div>
      </div>

      {/* Thin separator with label */}
      <div style={{ padding: "0 14px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em" }}>NAV</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
        </div>
      </div>

      {/* Nav — untraditional: tag on left, label right */}
      <nav style={{ padding: "0 10px", flex: 1 }}>
        {NAV.map((item, idx) => {
          const isActive = active === item.id;
          const isHov = hovered === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                marginBottom: 1,
                background: isActive ? "rgba(0,255,209,0.06)" : isHov ? "rgba(255,255,255,0.03)" : "transparent",
                border: "none",
                borderLeft: `2px solid ${isActive ? "#00FFD1" : "transparent"}`,
                color: isActive ? "#00FFD1" : isHov ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "all 0.18s cubic-bezier(0.16,1,0.3,1)",
                textAlign: "left",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              {/* Step tag */}
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: isActive ? "rgba(0,255,209,0.5)" : "rgba(255,255,255,0.15)",
                  letterSpacing: "0.06em",
                  width: 16,
                  flexShrink: 0,
                }}
              >
                {item.tag}
              </span>
              {item.icon}
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: isActive ? 500 : 400, letterSpacing: "-0.01em" }}>
                {item.label}
              </span>
              {isActive && (
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#00FFD1" }} />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom — live stats */}
      <div style={{ padding: "12px 14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        {/* Live tx counter — the untraditional detail */}
        <div
          style={{
            padding: "8px 10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginBottom: 3 }}>
            SESSION_TXS
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "rgba(0,255,209,0.7)", fontWeight: 600, letterSpacing: "0.04em" }}>
            {txCount.toLocaleString()}
          </div>
        </div>

        {/* Algorand testnet */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#00FFD1", flexShrink: 0 }} />
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            ALGORAND TESTNET
          </span>
        </div>

        <button
          onClick={handleDisconnect}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(255,68,68,0.1)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "rgba(255,68,68,0.45)",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 0.18s ease",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,68,68,0.07)";
            e.currentTarget.style.color = "#FF4444";
            e.currentTarget.style.borderColor = "rgba(255,68,68,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,68,68,0.45)";
            e.currentTarget.style.borderColor = "rgba(255,68,68,0.1)";
          }}
        >
          DISCONNECT
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside[data-sidebar="root"] {
            top: auto !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 60px !important;
            border-right: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
            background: rgba(8,8,18,0.92) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-around !important;
            padding: 0 8px !important;
            overflow: visible !important;
          }

          aside[data-sidebar="root"] > div:not(nav),
          aside[data-sidebar="root"] > nav + div,
          aside[data-sidebar="root"] > div + div + div,
          aside[data-sidebar="root"] > div + div,
          aside[data-sidebar="root"] > div:first-child {
            display: none !important;
          }

          aside[data-sidebar="root"] nav {
            display: flex !important;
            flex: 1 !important;
            justify-content: space-around !important;
            padding: 0 !important;
            height: 100% !important;
            align-items: center !important;
          }

          aside[data-sidebar="root"] nav button {
            width: auto !important;
            margin: 0 !important;
            border-left: none !important;
            padding: 8px !important;
            background: transparent !important;
          }

          aside[data-sidebar="root"] nav button span,
          aside[data-sidebar="root"] nav button span:first-child,
          aside[data-sidebar="root"] nav button span:last-child {
            display: none !important;
          }
        }

        @keyframes dot-pulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%     { transform:scale(1.6); opacity:0.3; }
        }
      `}</style>
    </aside>
  );
}
