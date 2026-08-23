interface Env {
  GAS_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const gasUrl = env.GAS_URL;

  if (!gasUrl) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Cloudflare環境変数 [GAS_URL] が設定されていません。管理画面から設定してください。'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const bodyText = await request.text();
    const response = await fetch(gasUrl, {
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
        message: `GASプロキシサーバーエラー: ${err.message || err}`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
