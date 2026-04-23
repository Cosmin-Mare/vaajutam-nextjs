import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const nextConfigDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Lock tracing to this app when a parent directory also has a lockfile (avoids mixed roots in CI/Azure).
  outputFileTracingRoot: path.join(nextConfigDir),
  // Tedious is Node-native; bundling it with the Pages API route can break the route module graph in production.
  serverExternalPackages: ["tedious"],
};

export default nextConfig;
