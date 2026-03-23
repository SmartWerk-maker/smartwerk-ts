import type { NextConfig } from "next";

console.log("ENV LOADED:", process.env.FIREBASE_PROJECT_ID);

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;