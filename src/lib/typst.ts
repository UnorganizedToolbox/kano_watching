import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';

// CBT問題のTypstレンダリング用コンパイラ。実ファイルシステムには一切触れず、
// addSource() で渡したソースをメモリ上でコンパイルするため、Vercelの
// サーバーレス関数上でも(実ディレクトリが存在しなくても)問題なく動作する。
// プロセス内で使い回すことで2回目以降のコンパイルは数ミリ秒で完了する。
const WORKSPACE = '/typst-workspace';
const ENTRY_PATH = `${WORKSPACE}/main.typ`;

let compiler: NodeCompiler | null = null;

function getCompiler(): NodeCompiler {
  if (!compiler) {
    compiler = NodeCompiler.create({ workspace: WORKSPACE });
  }
  return compiler;
}

export type TypstRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

export function renderTypstToSvg(source: string): TypstRenderResult {
  const c = getCompiler();
  try {
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
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
