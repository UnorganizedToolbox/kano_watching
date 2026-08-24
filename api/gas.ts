import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) {
    return res.status(500).json({
      status: 'error',
      message: 'Vercel環境変数 [GAS_URL] が設定されていません。管理画面から設定してください。'
    });
  }

  try {
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyText
    });

    const resBody = await response.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(resBody);
    } catch {
      parsedBody = resBody;
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(response.status).send(parsedBody);
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: `GASプロキシサーバーエラー: ${err.message || err}`
    });
  }
}
