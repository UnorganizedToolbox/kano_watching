import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // typst-ts-node-compiler はネイティブNode拡張(.node、約50MB)を含むため、
  // バンドルせずサーバー側でそのまま require させる必要がある。
  // プラットフォーム別パッケージ(-linux-x64-gnu 等)はoptionalDependencyかつ
  // 実行時の動的requireで読み込まれるため、Vercelのファイルトレースが
  // 自動検出できない場合に備えて outputFileTracingIncludes でも明示する。
  serverExternalPackages: [
    "@myriaddreamin/typst-ts-node-compiler",
    "@myriaddreamin/typst-ts-node-compiler-linux-x64-gnu",
  ],
  outputFileTracingIncludes: {
    "/admin/**": [
      "./node_modules/@myriaddreamin/typst-ts-node-compiler/**",
      "./node_modules/@myriaddreamin/typst-ts-node-compiler-linux-x64-gnu/**",
      "./assets/fonts/**",
    ],
  },
};

export default nextConfig;
