"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    label: "INIT",
    title: "Connect your wallet",
    desc: "Link Pera, Lute, or Exodus wallet. Sign up with a password. Instant JWT session.",
    tag: "AUTH",
    tagColor: "#00FFD1",
  },
  {
    num: "02",
    label: "EXEC",
    title: "Deposit ALGO",
    desc: "Sign a grouped transaction to deposit ALGO into the pool and receive pool shares.",
    tag: "TXN",
    tagColor: "#7B2FFF",
  },
  {
    num: "03",
    label: "YIELD",
    title: "Borrow or Earn",
    desc: "Use collateral or your Aura score to borrow. Or simply hold shares to earn from lending interest.",
    tag: "EARN",
    tagColor: "#FFB347",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="lend"
      ref={sectionRef}
      style={{ position: "relative", zIndex: 1, padding: "120px 6vw", background: "rgba(5,5,10,0.95)", overflow: "hidden" }}
    >
      {/* Debug-console section annotation — the unconventional element */}
      <div
        className="reveal"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 64,
          paddingBottom: 20,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(0,255,209,0.4)", letterSpacing: "0.05em" }}>
          // SECTION_03
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
          protocol.howItWorks()
        </span>
      </div>

      {/* Two-column header split — editorial asymmetry */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4vw",
          marginBottom: 80,
          alignItems: "end",
        }}
      >
        <h2
          className="font-display reveal"
          style={{
            transitionDelay: "0.05s",
            fontSize: "clamp(48px,6.5vw,88px)",
            fontWeight: 800,
            color: "#F0F0F0",
            letterSpacing: "-0.04em",
            lineHeight: 0.92,
          }}
        >
          Three<br />
          <span style={{ color: "rgba(255,255,255,0.2)", WebkitTextStroke: "1px rgba(255,255,255,0.3)" }}>
            steps.
          </span>
        </h2>
        <p
          className="reveal"
          style={{
            transitionDelay: "0.15s",
            fontFamily: "Inter,sans-serif",
            fontSize: 15,
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.7,
            maxWidth: 340,
            alignSelf: "end",
            paddingBottom: 4,
          }}
        >
          From wallet connection to yield generation — the full loop takes less than 60 seconds on Algorand testnet.
        </p>
      </div>

      {/* Steps — horizontal timeline rail layout */}
      <div style={{ position: "relative" }}>
        {/* Vertical rail line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 1,
            background: "linear-gradient(to bottom, #00FFD1, rgba(0,255,209,0.1))",
            opacity: visible ? 0.3 : 0,
            transition: "opacity 1s ease 0.3s",
          }}
          aria-hidden="true"
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              onMouseEnter={() => setActiveStep(i)}
              onMouseLeave={() => setActiveStep(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1px 1fr",
                gap: "0 32px",
                padding: "40px 0 40px 24px",
                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                cursor: "default",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-20px)",
                transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.13}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.13}s`,
              }}
            >
              {/* Step number — oversized outline */}
              <div
                className="font-display"
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "transparent",
                  WebkitTextStroke: `1px ${activeStep === i ? step.tagColor : "rgba(255,255,255,0.12)"}`,
                  transition: "color 0.3s ease, -webkit-text-stroke-color 0.3s ease",
                  userSelect: "none",
                  letterSpacing: "-0.04em",
                  alignSelf: "center",
                }}
                aria-hidden="true"
              >
                {step.num}
              </div>

              {/* Connector line + node dot */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ flex: 1, width: 1, background: "rgba(255,255,255,0.06)" }} />
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: activeStep === i ? step.tagColor : "rgba(255,255,255,0.2)",
                    border: `1px solid ${activeStep === i ? step.tagColor : "rgba(255,255,255,0.15)"}`,
                    boxShadow: activeStep === i ? `0 0 12px ${step.tagColor}` : "none",
                    transition: "all 0.3s ease",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, width: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Content */}
              <div style={{ display: "flex", alignItems: "center", gap: 40, minWidth: 0 }}>
                <div style={{ flex: 1 }}>
                  {/* Label pill + tag */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.2)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {step.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter,sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        color: step.tagColor,
                        background: `${step.tagColor}15`,
                        border: `1px solid ${step.tagColor}30`,
                        borderRadius: 4,
                        padding: "2px 8px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <h3
                    className="font-display"
                    style={{
                      fontSize: "clamp(22px,2.5vw,32px)",
                      fontWeight: 700,
                      color: activeStep === i ? "#F0F0F0" : "rgba(255,255,255,0.75)",
                      letterSpacing: "-0.025em",
                      marginBottom: 10,
                      transition: "color 0.3s ease",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "Inter,sans-serif",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.35)",
                      lineHeight: 1.65,
                      maxWidth: 480,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>

                {/* Right side: teal accent slash + step index */}
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    opacity: activeStep === i ? 1 : 0,
                    transform: activeStep === i ? "translateX(0)" : "translateX(8px)",
                    transition: "opacity 0.25s ease, transform 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: step.tagColor,
                      letterSpacing: "0.1em",
                    }}
                  >
                    step_{step.num}
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 1,
                      background: step.tagColor,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          #lend .steps-header { grid-template-columns: 1fr !important; }
          #lend .step-row { grid-template-columns: 52px 1px 1fr !important; gap: 0 20px !important; }
        }
      `}</style>
    </section>
  );
}
