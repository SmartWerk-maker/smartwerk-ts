"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  UserCredential,
} from "firebase/auth";

import "./register.css";

// -----------------------------
// TYPE GUARD FOR FIREBASE ERRORS
// -----------------------------
interface FirebaseError {
  code: string;
  message: string;
}

function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}

// -----------------------------
// CREATE STRIPE CUSTOMER (API CALL)
// -----------------------------
async function createStripeCustomer(token: string) {
  const res = await fetch("/api/stripe/create-customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  return await res.json();
}

// -----------------------------
// COMPONENT
// -----------------------------
export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

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

  // ---------------------------------
  // REGISTER WITH EMAIL + PASSWORD
  // ---------------------------------
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");

    // Validation
    if (!email || !pass || !confirm) return showError("Fill all fields.");
    if (pass.length < 6) return showError("Password must be at least 6 characters.");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pass)) return showError("Password must contain a special symbol.");
    if (pass !== confirm) return showError("Passwords do not match.");
    if (!agree) return showError("You must accept the Terms of Service.");

    try {
      setLoading(true);

      // 1️⃣ Create Firebase user
      const userCred: UserCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCred.user;

      // Refresh token (important for session cookie)
      const token = await user.getIdToken(true);

      // 2️⃣ Create Stripe Customer
      const stripeRes = await createStripeCustomer(token);
      console.log("🔥 Stripe customer created:", stripeRes);

      // 3️⃣ Save user to Firestore
      if (user.email) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            plan: "FREE",
            subscription: null,
            stripeCustomerId: stripeRes.customerId ?? null,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // 4️⃣ Send verification email
      await sendEmailVerification(user);

      showSuccess("Account created! Please verify your email.");

      setTimeout(() => {
        window.location.href = "/verify-email";
      }, 900);
    } catch (err: unknown) {
      const errors: Record<string, string> = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Invalid email.",
        "auth/weak-password": "Weak password.",
      };

      if (isFirebaseError(err)) {
        showError(errors[err.code] || "Registration failed.");
      } else {
        console.error(err);
        showError("Registration failed.");
      }
    }

    setLoading(false);
  }

  // ---------------------------------
  // GOOGLE REGISTER
  // ---------------------------------
  async function registerGoogle() {
    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;

      const token = await user.getIdToken(true);

      // Create Stripe Customer
      const stripeRes = await createStripeCustomer(token);

      if (user.email) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            plan: "FREE",
            subscription: null,
            stripeCustomerId: stripeRes.customerId ?? null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      showSuccess("Google registration OK!");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message || "Registration error");
      } else {
        console.error(err);
        showError("Registration error");
      }
    }

    setLoading(false);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="register-page">
      <div className="background"></div>

      <div className="topbar">
        <Link href="/" className="brand">💼 SmartWerk — Register</Link>
      </div>

      <div className="register-card">
        <h2>Register to SmartWerk</h2>

        {error && <div className="error-box">{error}</div>}
        {ok && <div className="ok-box">{ok}</div>}

        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <div className="form-check">
            <label className="switch">
              <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />
              <span className="slider"></span>
            </label>
            <span>I agree to the <Link href="/terms">Terms of Service</Link></span>
          </div>

          <button type="submit" className="btn-main" disabled={loading}>
            {loading ? "Registering…" : "Register"}
          </button>

          <button type="button" className="btn-google" onClick={registerGoogle} disabled={loading}>
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width={18}
              height={18}
              alt="google"
            />
            Sign up with Google
          </button>
        </form>

        <div className="footer-links">
          Already have an account? <Link href="/login">Login</Link>
        </div>

        <div className="footer-links">
          Forgot password? <Link href="/reset-password">reset-password</Link>
        </div>
      </div>
    </div>
  );
}