interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Cloudflare環境変数 [GEMINI_API_KEY] が設定されていません。管理画面から設定してください。'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const bodyText = await request.text();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyText
    });

    const resBody = await response.text();
    return new Response(resBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: `Geminiプロキシサーバーエラー: ${err.message || err}`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
