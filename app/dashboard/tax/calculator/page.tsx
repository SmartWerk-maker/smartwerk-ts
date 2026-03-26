"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import TaxCalculatorPage from "./TaxCalculatorPage";

import "./tax-calculator.css";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      setUser(u);
    });
    return () => unsub();
  }, []);

  if (!user) return null; // або spinner / redirect

  return <TaxCalculatorPage user={user} />;
}