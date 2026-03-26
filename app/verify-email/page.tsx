"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import "./verify-email.css";

export default function VerifyEmailPage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  function showMsg(type: "info" | "error" | "success", text: string) {
    setMsg({ type, text });
  }

  async function markEmailVerified(uid: string) {
    const ref = doc(db, "users", uid);
    await setDoc(
      ref,
      {
        emailVerified: true,
        emailVerifiedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login?return=/verify-email";
        return;
      }

      // Email вже підтверджено → одразу оновлюємо Firestore
      if (user.emailVerified) {
        await markEmailVerified(user.uid);
        window.location.href = "/dashboard";
        return;
      }

      setUserEmail(user.email || "");
    });

    return () => unsub();
  }, []);

  async function checkVerified() {
    const user = auth.currentUser;
    if (!user) return;

    showMsg("info", "Checking verification status…");

    await user.reload();

    if (user.emailVerified) {
      await markEmailVerified(user.uid);
      showMsg("success", "Email verified! Redirecting…");
      setTimeout(() => (window.location.href = "/dashboard"), 700);
    } else {
      showMsg(
        "error",
        "We still don’t see your email as verified. Please click the link in your inbox."
      );
    }
  }

  async function resendEmail() {
    const user = auth.currentUser;
    if (!user) return;

    showMsg("info", "Sending verification email…");

    try {
      await sendEmailVerification(user);
      showMsg("success", "Verification email sent! Check your inbox.");
    } catch (err) {
      console.error(err);
      showMsg("error", "Could not send email. Try again later.");
    }
  }

  return (
    <div className="verify-page">

      <div className="verify-card">
        <h2>Verify your Email</h2>

        <p>Please confirm your email:</p>
        <p className="email">{userEmail}</p>

        {msg && (
          <div className={`msg msg--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <button className="btn-main" onClick={checkVerified}>
          I verified my email
        </button>

        <button className="btn-secondary" onClick={resendEmail}>
          Resend verification email
        </button>

        <div className="footer">
          <Link href="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}