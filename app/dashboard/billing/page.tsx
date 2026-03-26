"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<string>("none");

  useEffect(() => {
    async function loadStatus() {
      const user = auth.currentUser;
      if (!user) {
        setStatus("none");
        setStatusLoading(false);
        return;
      }

      const token = await user.getIdToken();

      const res = await fetch("/api/user/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      setStatus(data.status ?? "none");
      setStatusLoading(false);
    }

    loadStatus();
  }, []);

  // DEFAULT price for billing page
  const DEFAULT_PRICE = "price_1SXTbnJ788Fa6pgUC1Nb05cf"; // monthly

  async function startCheckout() {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    setLoading(true);

    const token = await user.getIdToken();

    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        priceId: DEFAULT_PRICE,
      }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    alert(data.error || "Unable to start checkout");
    setLoading(false);
  }

  async function openPortal() {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    setLoading(true);

    const token = await user.getIdToken();

    const res = await fetch("/api/stripe/create-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    alert(data.error || "Unable to open portal");
    setLoading(false);
  }

  return (
    <div className="billing-page">
      <h1>Billing</h1>

      <p>
        Subscription status:
        {statusLoading ? " Loading..." : ` ${status}`}
      </p>

      <button onClick={startCheckout} disabled={loading}>
        Subscribe
      </button>

      <button onClick={openPortal} disabled={loading}>
        Open Billing Portal
      </button>
    </div>
  );
}