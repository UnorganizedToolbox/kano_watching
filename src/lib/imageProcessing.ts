// 質問箱に添付する画像をブラウザ側で軽量化する。
// 長辺を最大1600pxに縮小し、モノクロJPEGとして再エンコードする
// (問題文の写真は基本的に白黒で判読に支障が出にくく、圧縮率も大きく上がるため)。
// 処理に失敗した場合(未対応フォーマット等)は元のファイルをそのまま返す。

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function processQaImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (e) {
    console.error('Failed to process QA image, falling back to original file', e);
    return file;
  }
}
