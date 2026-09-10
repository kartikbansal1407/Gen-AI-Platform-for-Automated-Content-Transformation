import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate test/demo servers from the operator's running development server.
  distDir: process.env.CONTENT_FORGE_DIST_DIR || ".next",
  output: "standalone",
};

export default nextConfig;
