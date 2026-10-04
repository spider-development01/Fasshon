export async function onRequestPost(context) {
  const { request, env } = context;
  const FAL_KEY = env.FAL_KEY;

  if (!FAL_KEY) {
    return json({ error: 'FAL_KEY is not configured in Cloudflare Pages environment variables.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const fileName = body?.file_name || `kami_${Date.now()}.png`;
  const contentType = body?.content_type || 'image/png';

  try {
    const initRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_name: fileName, content_type: contentType }),
    });

    const data = await initRes.json().catch(() => ({}));

    if (!initRes.ok) {
      const msg = data?.detail?.[0]?.msg || data?.message || data?.error || `Upload initiate failed (${initRes.status})`;
      return json({ error: msg }, initRes.status);
    }

    if (!data?.upload_url || !data?.file_url) {
      return json({ error: 'Malformed response from fal storage.' }, 502);
    }

    return json({ upload_url: data.upload_url, file_url: data.file_url }, 200);
  } catch (err) {
    return json({ error: 'Upstream request failed: ' + (err?.message || 'unknown') }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
