"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { login, logout, signup } from "@/src/utils/authService";
import { bindPeraDisconnect as bindPeraDisconnectEvent, connectLute, connectPera, truncateAddress } from "@/src/utils/walletService";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Wallet = "pera" | "lute" | "exodus";

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"wallet" | "password">("wallet");
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"login" | "signup" | null>(null);
  const [walletLoading, setWalletLoading] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const peraDisconnectBound = useRef(false);

  const walletConfig: Record<Wallet, { label: string; subtitle: string; color: string; accentColor: string; bgColor: string; borderColor: string }> = {
    pera: {
      label: "Pera Wallet",
      subtitle: "Official Algorand wallet",
      color: "#00FFD1",
      accentColor: "#00FFD1",
      bgColor: "rgba(0,255,209,0.1)",
      borderColor: "rgba(0,255,209,0.2)",
    },
    lute: {
      label: "Lute Wallet",
      subtitle: "Algorand Web Wallet",
      color: "#7B2FFF",
      accentColor: "#7B2FFF",
      bgColor: "rgba(123,47,255,0.1)",
      borderColor: "rgba(123,47,255,0.2)",
    },
    exodus: {
      label: "Exodus",
      subtitle: "Multi-chain wallet",
      color: "#FFB347",
      accentColor: "#FFB347",
      bgColor: "rgba(255,183,71,0.1)",
      borderColor: "rgba(255,183,71,0.2)",
    },
  };

  const bindPeraDisconnect = () => {
    if (peraDisconnectBound.current) return;
    bindPeraDisconnectEvent(() => logout()).catch(() => {});
    peraDisconnectBound.current = true;
  };

  const handleWalletSelect = async (wallet: Wallet) => {
    if (wallet === "exodus") return; // Disabled for now
    setWalletLoading(wallet);
    setError("");

    try {
      const accounts = wallet === "pera" ? await connectPera() : await connectLute();
      const nextWalletAddress = accounts[0];
      if (!nextWalletAddress) {
        throw new Error("No wallet account received from wallet provider");
      }

      if (wallet === "pera") bindPeraDisconnect();

      setSelectedWallet(wallet);
      setWalletAddress(nextWalletAddress);
      setStep("password");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setWalletLoading(null);
    }
  };

  const handleLogin = async () => {
    if (!selectedWallet || !walletAddress.trim() || !password) {
      setError("Please connect a wallet and enter your password");
      return;
    }

    setIsLoading(true);
    setLoadingAction("login");
    setError("");

    try {
      await login(walletAddress.trim(), password);
      localStorage.setItem("algocrefi_wallet_type", selectedWallet);

      setTimeout(() => {
        onClose();
        router.push("/dashboard");
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSignup = async () => {
    if (!selectedWallet || !walletAddress.trim() || !password) {
      setError("Please connect a wallet and enter your password");
      return;
    }

    setIsLoading(true);
    setLoadingAction("signup");
    setError("");

    try {
      await signup(walletAddress.trim(), password);
      await login(walletAddress.trim(), password);
      localStorage.setItem("algocrefi_wallet_type", selectedWallet);

      setTimeout(() => {
        onClose();
        router.push("/dashboard");
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          zIndex: 1000,
          animation: "fade-in-modal 0.25s ease",
        }}
      />

      {/* Modal Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 440px)",
          background: "linear-gradient(145deg, #0D0D1A 0%, #080810 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 22,
          padding: 36,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          zIndex: 1001,
          animation: "modal-scale-in 0.35s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Decorative header — orbital rings */}
        <div
          aria-hidden
          style={{
            textAlign: "center",
            marginBottom: 24,
            opacity: 0.4,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" stroke="#00FFD1" strokeWidth="0.75" fill="none" opacity="0.3" />
            <circle cx="40" cy="40" r="24" stroke="#7B2FFF" strokeWidth="0.75" fill="none" opacity="0.4" />
            <circle cx="40" cy="40" r="16" stroke="#00FFD1" strokeWidth="1" fill="none" opacity="0.5" strokeDasharray="8 4" />
          </svg>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#F0F0F0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
        >
          ×
        </button>

        {/* STEP 1 — Choose Wallet */}
        {step === "wallet" && (
          <div style={{ animation: "fade-in-modal 0.3s ease" }}>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F0", textAlign: "center", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
              Connect Wallet
            </h2>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 28, margin: "8px 0 28px 0" }}>
              Select your Algorand wallet
            </p>

            {/* Wallet cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(["pera", "lute", "exodus"] as Wallet[]).map((wallet, i) => {
                const config = walletConfig[wallet];
                const isDisabled = wallet === "exodus";
                return (
                  <button
                    key={wallet}
                    onClick={() => handleWalletSelect(wallet)}
                    disabled={isDisabled || walletLoading === wallet}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: 14,
                      padding: "16px 18px",
                      cursor: isDisabled ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: isDisabled ? 0.45 : 1,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled) {
                        e.currentTarget.style.borderColor = "rgba(0,255,209,0.25)";
                        e.currentTarget.style.background = "rgba(0,255,209,0.03)";
                        e.currentTarget.style.transform = "translateX(3px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled) {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.transform = "translateX(0)";
                      }
                    }}
                  >
                    {/* Circle icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: config.bgColor,
                        border: `1px solid ${config.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: config.color }}>
                        {wallet[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 500, color: "#F0F0F0" }}>
                        {config.label}
                      </div>
                      <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                        {config.subtitle}
                      </div>
                    </div>

                    {/* Arrow or Soon badge */}
                    {walletLoading === wallet ? (
                      <span style={{ color: "#00FFD1", fontSize: 12 }}>Connecting...</span>
                    ) : isDisabled ? (
                      <div
                        style={{
                          background: "rgba(255,183,71,0.1)",
                          color: "#FFB347",
                          border: "1px solid rgba(255,183,71,0.2)",
                          borderRadius: 9999,
                          fontFamily: "Inter,sans-serif",
                          fontSize: 10,
                          padding: "3px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Soon
                      </div>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 18, transition: "color 0.2s ease" }}>
                        →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0", opacity: 0.5 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.1)" }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Login link */}
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0 }}>
              Already have a session?{" "}
              <span
                style={{ color: "#00FFD1", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => {
                  if (!walletAddress) {
                    setError("Connect a wallet first");
                    return;
                  }
                  setStep("password");
                }}
              >
                Login with address
              </span>
            </p>
            {error && (
              <div
                style={{
                  marginTop: 12,
                  background: "rgba(255,68,68,0.06)",
                  border: "1px solid rgba(255,68,68,0.18)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontFamily: "Inter,sans-serif",
                  fontSize: 13,
                  color: "rgba(255,100,100,0.9)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Enter Password */}
        {step === "password" && selectedWallet && (
          <div style={{ animation: "fade-in-modal 0.3s ease" }}>
            {/* Back button */}
            <button
              onClick={() => setStep("wallet")}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "Inter,sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                marginBottom: 20,
                transition: "color 0.15s ease",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0F0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              ← Back
            </button>

            {/* Wallet chip */}
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 9999,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "0 auto 24px",
                justifyContent: "center",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: walletConfig[selectedWallet].color,
                  boxShadow: `0 0 8px ${walletConfig[selectedWallet].color}`,
                }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {selectedWallet.toUpperCase()} · {truncateAddress(walletAddress)}
              </span>
            </div>

            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F0", textAlign: "center", margin: "0 0 8px 0" }}>
              Enter Password
            </h2>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 24 }}>
              New here? We'll create your account.
            </p>

            {/* Password input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "14px 44px 14px 16px",
                    color: "#F0F0F0",
                    fontFamily: "Inter,sans-serif",
                    fontSize: 15,
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#00FFD1";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,255,209,0.07)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.3)",
                    cursor: "pointer",
                    fontSize: 16,
                    transition: "color 0.15s ease",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "#00FFD1",
                  color: "#05050A",
                  border: "none",
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: "Inter,sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(0,255,209,0.25)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(0,0,0,0.2)",
                        borderTop: "2px solid #05050A",
                        borderRadius: "50%",
                        animation: "spinner 0.8s linear infinite",
                      }}
                    />
                    {loadingAction === "login" ? "Verifying..." : "Please wait..."}
                  </>
                ) : (
                  "Log In"
                )}
              </button>
              <button
                onClick={handleSignup}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: "Inter,sans-serif",
                  fontSize: 15,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: isLoading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#F0F0F0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  }
                }}
              >
                {isLoading && loadingAction === "signup" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTop: "2px solid rgba(255,255,255,0.85)",
                        borderRadius: "50%",
                        animation: "spinner 0.8s linear infinite",
                      }}
                    />
                    Creating...
                  </span>
                ) : (
                  "Sign Up"
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  background: "rgba(255,68,68,0.06)",
                  border: "1px solid rgba(255,68,68,0.18)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontFamily: "Inter,sans-serif",
                  fontSize: 13,
                  color: "rgba(255,100,100,0.9)",
                  animation: "scale-fade-in 0.2s ease",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in-modal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-scale-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes scale-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
