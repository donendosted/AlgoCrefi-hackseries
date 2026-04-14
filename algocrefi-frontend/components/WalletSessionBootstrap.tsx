"use client";

import { useEffect } from "react";
import { isLoggedIn } from "@/src/utils/authService";
import { getStoredWalletType, reconnectPera } from "@/src/utils/walletService";

export default function WalletSessionBootstrap() {
  useEffect(() => {
    const tryReconnect = async () => {
      try {
        if (getStoredWalletType() === "pera" && isLoggedIn()) {
          await reconnectPera();
        }
      } catch {
        // Silent reconnect failure is non-blocking.
      }
    };

    tryReconnect();
  }, []);

  return null;
}
