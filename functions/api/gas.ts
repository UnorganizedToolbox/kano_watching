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
        message: 'Cloudflare環境変数 [GAS_URL] が設定されていません。Pages管理画面の「設定」➔「環境変数」で本番環境に設定し、再デプロイしてください。'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const bodyText = await request.text();
    
    // Explicitly add redirect follow to handle GAS 302 redirects
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: bodyText,
      redirect: 'follow'
    });

    const resBody = await response.text();
    return new Response(resBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    const maskedUrl = gasUrl.length > 15 ? `${gasUrl.substring(0, 15)}...${gasUrl.substring(gasUrl.length - 5)}` : 'Invalid URL';
    return new Response(
      JSON.stringify({
        status: 'error',
        message: `GASプロキシサーバーエラー: ${err.message || err} (転送先: ${maskedUrl})`
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
