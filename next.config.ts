import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "mammoth", "tesseract.js", "pg", "redis"]
};

export default nextConfig;
