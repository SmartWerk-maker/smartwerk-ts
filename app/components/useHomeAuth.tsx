"use client";

import { useEffect, useState } from "react";
import { auth } from "";
import { onAuthStateChanged, User } from "firebase/auth";

export function useHomeAuth() {
  const [isLogged, setIsLogged] = useState<boolean | null>(null);

  useEffect(() => {
    document.body.classList.add("auth-pending");

    let resolved = false;

    const unsub = onAuthStateChanged(
      auth,
      (user: User | null) => {
        if (resolved) return;
        resolved = true;

        setIsLogged(!!user);
        document.body.classList.remove("auth-pending");
      },
      (err) => {
        console.error("[HomeAuth] Listener error:", err);

        if (resolved) return;
        resolved = true;

        setIsLogged(false);
        document.body.classList.remove("auth-pending");
      }
    );

    const timer = setTimeout(() => {
      if (!resolved) {
        console.warn("[HomeAuth] Timeout → fallback");
        resolved = true;

        setIsLogged(false);
        document.body.classList.remove("auth-pending");
      }
    }, 3000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  return { isLogged };
}