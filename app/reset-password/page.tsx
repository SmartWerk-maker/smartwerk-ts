"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import "./reset.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  function showErr(msg: string) {
    setError(msg);
    setOk("");
  }

  function showOk(msg: string) {
    setOk(msg);
    setError("");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!email) return showErr("Please enter your email.");

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      showOk("Reset link sent! Check your inbox.");
    } catch (err: unknown) {
  const map: Record<
    "auth/user-not-found" | "auth/invalid-email",
    string
  > = {
    "auth/user-not-found": "User not found",
    "auth/invalid-email": "Invalid email format",
  };

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    const code = (err as { code: "auth/user-not-found" | "auth/invalid-email" }).code;
    showErr(map[code] ?? "Something went wrong.");
  } else {
    showErr("Something went wrong.");
  }
}
    setLoading(false);
  }

  return (
    <div className="reset-page">
      <div className="background"></div>

      <div className="topbar">
        <Link href="/" className="brand">
          💼 SmartWerk — Reset Password
        </Link>
      </div>

      <div className="card">
        <h2>Reset Your Password</h2>
        <p className="muted">Enter your email to receive a reset link</p>

        {error && <div className="msg error">{error}</div>}
        {ok && <div className="msg ok">{ok}</div>}

        <form onSubmit={handleReset}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>

          <Link href="/register" className="btn ghost small">
            Need an account?
          </Link>
        </form>

        <div className="foot">
          <Link href="/login" className="btn ghost fullwidth">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}