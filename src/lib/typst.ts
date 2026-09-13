// CBT問題のTypstレンダリング用コンパイラ。実ファイルシステムには一切触れず、
// addSource() で渡したソースをメモリ上でコンパイルするため、Vercelの
// サーバーレス関数上でも(実ディレクトリが存在しなくても)問題なく動作する。
// プロセス内で使い回すことで2回目以降のコンパイルは数ミリ秒で完了する。
//
// ネイティブアドオン(.node、約50MB)の読み込みに失敗した場合でもサーバー
// アクション全体をクラッシュさせず、呼び出し元にエラーとして返せるよう、
// 静的importではなく関数内で動的requireする。
//
// フォントについて: Vercelのサーバーレス実行環境には日本語フォントが
// インストールされていない(ローカル開発機と違いシステムフォントに頼れない)。
// そのため日本語を含む問題文が文字化け/空白になる。これを避けるため、
// Noto Sans JP(OFLライセンス、assets/fonts/ に同梱)をメモリ上のフォント
// として明示的にコンパイラへ渡す。

import { readFileSync } from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/typst-workspace';
const ENTRY_PATH = `${WORKSPACE}/main.typ`;
const FONT_PATH = path.join(process.cwd(), 'assets/fonts/NotoSansJP-Variable.ttf');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let compiler: any = null;

function getCompiler() {
  if (!compiler) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NodeCompiler } = require('@myriaddreamin/typst-ts-node-compiler');
    const fontBuffer = readFileSync(FONT_PATH);
    compiler = NodeCompiler.create({
      workspace: WORKSPACE,
      fontArgs: [{ fontBlobs: [fontBuffer] }],
    });
  }
  return compiler;
}

export type TypstRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

export function renderTypstToSvg(source: string): TypstRenderResult {
  try {
    const c = getCompiler();
    c.addSource(ENTRY_PATH, source);
    const doc = c.compile({ mainFilePath: ENTRY_PATH });

    if (!doc.result) {
      const diagnostics = doc.takeDiagnostics();
      const details = (diagnostics?.shortDiagnostics ?? []) as Array<{ message?: string }>;
      const message = details.length > 0
        ? details.map(d => d.message || JSON.stringify(d)).join('\n')
        : 'コンパイルに失敗しました';
      return { ok: false, error: message };
    }

    const svg = c.svg(doc.result);
    return { ok: true, svg };
  } catch (e) {
    return { ok: false, error: `Typstコンパイラの初期化/実行に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }
}
