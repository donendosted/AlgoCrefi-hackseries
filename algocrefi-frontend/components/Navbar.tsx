"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getWalletAddress, isLoggedIn } from "@/src/utils/authService";
import { truncateAddress } from "@/src/utils/walletService";

const NAV_LINKS = [
  { label: "Pool", href: "#pool" },
  { label: "Lend", href: "#lend" },
  { label: "Aura", href: "#aura" },
  { label: "Analytics", href: "#analytics" },
];

export default function Navbar({ onEnterApp }: { onEnterApp: () => void }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Pool");
  const [walletChip, setWalletChip] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < lastScrollY.current || currentY < 60);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      if (!isLoggedIn()) {
        setWalletChip(null);
        return;
      }
      const address = getWalletAddress();
      setWalletChip(address ? truncateAddress(address) : "Connected");
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0" : "-80px"})`,
          transition: "transform 0.3s ease",
          zIndex: 999,
          width: "auto",
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          style={{
            background: "rgba(8,8,16,0.75)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "9999px",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: "32px",
            whiteSpace: "nowrap",
          }}
        >
          {/* Wordmark */}
          <a
            href="#"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: "16px",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
            aria-label="AlgoCrefi home"
          >
            <span style={{ color: "#F0F0F0" }}>Algo</span>
            <span style={{ color: "#00FFD1" }}>Crefi</span>
          </a>

          {/* Desktop nav links */}
          <nav
            className="desktop-nav"
            style={{ display: "flex", gap: "24px", alignItems: "center" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setActiveLink(link.label)}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: activeLink === link.label ? "#F0F0F0" : "#6B7280",
                  textDecoration: "none",
                  borderBottom:
                    activeLink === link.label
                      ? "1px solid #00FFD1"
                      : "1px solid transparent",
                  paddingBottom: "2px",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeLink !== link.label)
                    (e.currentTarget as HTMLAnchorElement).style.color = "#F0F0F0";
                }}
                onMouseLeave={(e) => {
                  if (activeLink !== link.label)
                    (e.currentTarget as HTMLAnchorElement).style.color = "#6B7280";
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {walletChip && (
            <span
              style={{
                border: "1px solid rgba(0,255,209,0.25)",
                background: "rgba(0,255,209,0.08)",
                color: "#00FFD1",
                borderRadius: "9999px",
                padding: "8px 12px",
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.04em",
              }}
            >
              {walletChip}
            </span>
          )}

          {/* Launch App button */}
          <button
            onClick={() => {
              if (walletChip) {
                router.push("/dashboard");
                return;
              }
              onEnterApp();
            }}
            style={{
              border: "1px solid #00FFD1",
              background: "transparent",
              color: "#00FFD1",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              cursor: "none",
              transition: "background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget;
              btn.style.background = "#00FFD1";
              btn.style.color = "#05050A";
              btn.style.boxShadow = "0 0 20px rgba(0,255,209,0.3)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.background = "transparent";
              btn.style.color = "#00FFD1";
              btn.style.boxShadow = "none";
            }}
            aria-label="Launch App"
          >
            {walletChip ? "Dashboard" : "Launch App"}
          </button>

          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "none",
              padding: "4px",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "20px",
                  height: "1.5px",
                  background: "#F0F0F0",
                  transition: "transform 0.2s, opacity 0.2s",
                  transform:
                    menuOpen && i === 0
                      ? "rotate(45deg) translate(4.5px, 4.5px)"
                      : menuOpen && i === 2
                      ? "rotate(-45deg) translate(4.5px, -4.5px)"
                      : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 998,
            background: "rgba(8,8,16,0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "20px",
            padding: "20px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: "200px",
          }}
          role="menu"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              role="menuitem"
              onClick={() => {
                setActiveLink(link.label);
                setMenuOpen(false);
              }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "15px",
                color: activeLink === link.label ? "#00FFD1" : "#F0F0F0",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              if (walletChip) {
                router.push("/dashboard");
                setMenuOpen(false);
                return;
              }
              onEnterApp();
            }}
            style={{
              border: "1px solid #00FFD1",
              background: "transparent",
              color: "#00FFD1",
              borderRadius: "9999px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "none",
              marginTop: "4px",
            }}
          >
            {walletChip ? "Dashboard" : "Launch App"}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
