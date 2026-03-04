import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the workspace root explicitly to this directory to prevent
  // Next.js from detecting a parent lockfile and using the wrong root.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
