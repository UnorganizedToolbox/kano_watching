import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // typst-ts-node-compiler はネイティブNode拡張(.node)を含むため、
  // バンドルせずサーバー側でそのまま require させる必要がある
  serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler"],
};

export default nextConfig;
