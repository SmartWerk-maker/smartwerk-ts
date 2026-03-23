"use client";

import { useState } from "react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  UserCredential,
} from "firebase/auth";

import "./login.css";

// -----------------------------
// TYPE GUARD FOR FIREBASE ERRORS
// -----------------------------
interface FirebaseError {
  code: string;
  message: string;
}

function isFirebaseError(err: unknown): err is FirebaseError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

// -----------------------------
// FIRESTORE SYNC HELPER
// -----------------------------
async function ensureUserInFirestore(uid: string, email: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(
      userRef,
      {
        email,
        plan: "FREE",
        subscription: null,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("🔥 Created Firestore user on login");
  } else {
    await setDoc(
      userRef,
      {
        email,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

// -----------------------------
// COMPONENT
// -----------------------------
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    setOk("");
  };

  const showSuccess = (msg: string) => {
    setOk(msg);
    setError("");
  };

  // -----------------------------
  // HELPER: ENSURE STRIPE CUSTOMER EXISTS
  // -----------------------------
  async function ensureStripeCustomer(token: string) {
    const res = await fetch("/api/stripe/create-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    console.log("Stripe create-customer →", data);
  }

  // -----------------------------
  // EMAIL + PASSWORD LOGIN
  // -----------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");

    if (!email || !pass) return showError("Fill all fields.");
    if (pass.length < 6) return showError("Password too short.");

    try {
      setLoading(true);

      const result: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        pass
      );

      // Force refresh, required for middleware (__session cookie)
      const token = await auth.currentUser!.getIdToken(true);

      const user = result.user;
      if (user.email) {
        await ensureUserInFirestore(user.uid, user.email);
      }

      // 🎯 CREATE STRIPE CUSTOMER
      await ensureStripeCustomer(token);

      showSuccess("Success! Redirecting…");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err: unknown) {
      const map: Record<string, string> = {
        "auth/user-not-found": "User not found.",
        "auth/wrong-password": "Wrong password.",
        "auth/invalid-email": "Invalid email.",
        "auth/too-many-requests": "Too many attempts, try later.",
      };

      if (isFirebaseError(err)) {
        showError(map[err.code] || "Email or Password failed.");
      } else {
        console.error(err);
        showError("Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // GOOGLE LOGIN
  // -----------------------------
  async function loginGoogle() {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const token = await auth.currentUser!.getIdToken(true);
      const user = result.user;

      if (user.email) {
        await ensureUserInFirestore(user.uid, user.email);
      }

      // 🎯 CREATE STRIPE CUSTOMER
      await ensureStripeCustomer(token);

      showSuccess("Google login OK!");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err: unknown) {
      showError(
        err instanceof Error ? err.message : "Google login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // RESET PASSWORD
  // -----------------------------
  async function sendReset() {
    if (!resetEmail) return showError("Enter your email.");

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showSuccess("Reset link sent!");
    } catch (err: unknown) {
      showError(
        isFirebaseError(err) ? err.message : "Error sending reset email"
      );
    }
  }

  return (
    <div className="login-page">
      <div className="topbar">
        <Link href="/" className="brand">
          💼 SmartWerk — Login
        </Link>
      </div>

      <div className="center">
        <div className="card">
          <h2>Login to SmartWerk</h2>
          <p className="muted">Log in to continue</p>

          {error && <div id="errorBox">{error}</div>}
          {ok && <div id="okBox">{ok}</div>}

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field password-wrap">
              <label>Password</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>

            <button className="btn" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={loginGoogle}
              disabled={loading}
              style={{ marginTop: "10px" }}
            >
              Login with Google
            </button>

            <div className="foot">
              <p>Password reset</p>
              <input
                type="email"
                placeholder="Your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <button type="button" className="btn" onClick={sendReset}>
                Send reset link
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}