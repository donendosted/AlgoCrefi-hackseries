"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/src/utils/authService";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return <>{children}</>;
}
