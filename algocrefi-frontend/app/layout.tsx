import type { Metadata, Viewport } from "next";
import "./globals.css";
import WalletSessionBootstrap from "@/components/WalletSessionBootstrap";

export const metadata: Metadata = {
  title: "AlgoCrefi — Permissionless Lending on Algorand",
  description:
    "AlgoCrefi is a permissionless liquidity protocol on Algorand. Deposit ALGO to earn yield. Borrow against collateral or your Aura credit score.",
  keywords: ["Algorand", "DeFi", "lending", "liquidity pool", "ALGO", "AlgoCrefi"],
  openGraph: {
    title: "AlgoCrefi — Permissionless Lending on Algorand",
    description: "Deposit ALGO to earn yield. Borrow against collateral or your Aura credit score.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05050A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="loading">
        <WalletSessionBootstrap />
        {children}
      </body>
    </html>
  );
}
