"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import "./pricing.css"; // підключення твого стилю

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const PRICES: Record<string, string> = {
    monthly: "price_1SXTbnJ788Fa6pgUC1Nb05cf",
    quarterly: "price_1SXTd0J788Fa6pgUWjHBFqdt",
    halfyear: "price_1SXTduJ788Fa6pgURlop7KYp",
    yearly: "price_1SXTerJ788Fa6pgUvf5WQSOJ",
  };

  async function subscribe(plan: keyof typeof PRICES) {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "/login?return=/pricing";
      return;
    }

    setLoading(true);
    const token = await user.getIdToken();

    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        priceId: PRICES[plan], // тепер priceId правильно передається
      }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;

    setLoading(false);
  }

  return (
    <div className="pricing-page">

      {/* HEADER */}
      <div className="pricing-header">
        <Link href="/" className="back">Back</Link>
        <h1>SmartWerk PRO</h1>
        <p className="subtitle">Choose the plan that fits your workflow</p>
        <p className="subnote">Cancel anytime. Instant access after payment.</p>
      </div>

      {/* PRICING GRID */}
      <div className="pricing-container">

        <div className="plan-card">
          <h2>Monthly</h2>
          <p className="plan-subtitle">€6.99 / month</p>
          <p className="price">€6.99 <span>/mo</span></p>

          <ul className="plan-features">
            <li>Full PRO access</li>
            <li>Priority updates</li>
            <li>Email support</li>
          </ul>

          <button
            className="btn-upgrade"
            onClick={() => subscribe("monthly")}
            disabled={loading}
          >
            Subscribe
          </button>
        </div>

        <div className="plan-card">
          <h2>Quarterly</h2>
          <p className="plan-subtitle">€17.99 / 3 months</p>
          <p className="price">€17.99 <span>/3 mo</span></p>

          <ul className="plan-features">
            <li>Full PRO access</li>
            <li>Priority updates</li>
            <li>Email support</li>
          </ul>

          <button
            className="btn-upgrade"
            onClick={() => subscribe("quarterly")}
            disabled={loading}
          >
            Subscribe
          </button>
        </div>

        <div className="plan-card highlight">
          <span className="badge hot">Most Popular</span>
          <h2>Half Year</h2>
          <p className="plan-subtitle">€24.99 / 6 months</p>
          <p className="price">€24.99 <span>/6 mo</span></p>

          <ul className="plan-features">
            <li>Full PRO access</li>
            <li>Priority updates</li>
            <li>Email support</li>
            <li>Best price per month</li>
          </ul>

          <button
            className="btn-upgrade"
            onClick={() => subscribe("halfyear")}
            disabled={loading}
          >
            Subscribe
          </button>
        </div>

        <div className="plan-card">
          <h2>Yearly</h2>
          <p className="plan-subtitle">€39.99 / year</p>
          <p className="price">€39.99 <span>/yr</span></p>

          <ul className="plan-features">
            <li>Full PRO access</li>
            <li>Priority updates</li>
            <li>Email support</li>
          </ul>

          <button
            className="btn-upgrade"
            onClick={() => subscribe("yearly")}
            disabled={loading}
          >
            Subscribe
          </button>
        </div>

      </div>

      <footer>
        <p>SmartWerk © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}