import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js builds on Vercel must not typecheck Cloudflare Worker-only modules.
  // The ordinary local/vinext build still uses tsconfig.json unchanged.
  ...(process.env.VERCEL ? { typescript: { tsconfigPath: "tsconfig.vercel.json" } } : {}),
};

export default nextConfig;
