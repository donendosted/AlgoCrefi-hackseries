"use client";
import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import ParticleCanvas from "@/components/ParticleCanvas";
import Loader from "@/components/Loader";
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
  const [loaded, setLoaded] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  useScrollReveal();

  return (
    <>
      {/* Fixed particle constellation canvas — sits behind everything */}
      <ParticleCanvas />

      {/* Full-screen entry loader */}
      <Loader onDone={() => setLoaded(true)} />

      {/* Custom lerp cursor */}
      <Cursor />

      {/* Wallet Connect Modal */}
      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      {/* Page content — fades in after loader exits */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.5s ease",
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
