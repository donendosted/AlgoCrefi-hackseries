"use client";

import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { QueryClient } from "@tanstack/react-query";
import { WalletProvider } from "@txnlab/use-wallet-react";
import { rainbowKitConfig, walletManager } from "@/src/utils/xchainConfig";
import "@rainbow-me/rainbowkit/styles.css";

if (!(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;
}

if (!(globalThis as typeof globalThis & { TronWebProto?: { Transaction: Record<string, never> } }).TronWebProto) {
  (globalThis as typeof globalThis & { TronWebProto?: { Transaction: Record<string, never> } }).TronWebProto = {
    Transaction: {},
  };
}

const queryClient = new QueryClient();
const RainbowKitProvider = rainbowKitConfig.Provider;

export default function XChainProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProvider manager={walletManager}>
      <RainbowKitProvider
        queryClient={queryClient}
        resolvedTheme="dark"
        walletManager={walletManager}
      >
        {children}
      </RainbowKitProvider>
    </WalletProvider>
  );
}
