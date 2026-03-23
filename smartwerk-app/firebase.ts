// firebase.ts — Next.js client Firebase

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp397Ax_jaMI85vOXicOi61g64HvvA_Kg",
  authDomain: "smartwerk8520.firebaseapp.com",
  projectId: "smartwerk8520",
  storageBucket: "smartwerk8520.firebasestorage.app",
  messagingSenderId: "607670981972",
  appId: "1:607670981972:web:c07103c981c86860d724c1",
  measurementId: "G-JDVFMD8MDS",
};

// щоб не ініціалізувалось по 10 разів при hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);