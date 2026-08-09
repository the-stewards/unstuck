import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project's own git repo root is this directory, not the parent
  // DASHBOARD folder (which holds other unrelated projects and its own
  // lockfile) — pins Turbopack's root so it stops warning about that.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
