"use client";
import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Cursor from "@/components/Cursor";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import BentoGrid from "@/components/BentoGrid";
import HowItWorks from "@/components/HowItWorks";
import AuraSection from "@/components/AuraSection";
import StatsTicker from "@/components/StatsTicker";
import Footer from "@/components/Footer";
import WalletConnectModal from "@/components/WalletConnectModal";

export default function Home() {
  const [showWalletModal, setShowWalletModal] = useState(false);
  useScrollReveal();

  return (
    <>
      {/* Custom lerp cursor */}
      <Cursor />

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      {/* Page content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <Navbar onEnterApp={() => setShowWalletModal(true)} />
        <main>
          <HeroSection onEnterApp={() => setShowWalletModal(true)} />
          <BentoGrid />
          <HowItWorks />
          <AuraSection />
          <StatsTicker />
        </main>
        <Footer />
      </div>
    </>
  );
}
