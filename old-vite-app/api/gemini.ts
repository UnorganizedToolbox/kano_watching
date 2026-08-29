import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  // Read X-Student-Name header from request
  const studentNameHeader = req.headers['x-student-name'] || '';
  const studentName = decodeURIComponent(Array.isArray(studentNameHeader) ? studentNameHeader[0] : studentNameHeader).trim();

  let apiKey = process.env.GEMINI_API_KEY;
  if (studentName === 'Admin') {
    apiKey = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;
  }

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Vercel環境変数 [GEMINI_API_KEY] が設定されていません。管理画面から設定してください。'
    });
  }

  try {
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
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
      message: `Geminiプロキシサーバーエラー: ${err.message || err}`
    });
  }
}
