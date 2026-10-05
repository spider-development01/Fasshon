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

  const { prompt, negative_prompt, image_urls } = body || {};

  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'Missing "prompt".' }, 400);
  }
  if (!Array.isArray(image_urls) || image_urls.length === 0) {
    return json({ error: 'Missing "image_urls" array.' }, 400);
  }

  try {
    const falRes = await fetch('https://fal.run/google/nano-banana-lite/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative_prompt || '',
        image_urls,
      }),
    });

    const data = await falRes.json().catch(() => ({}));

    if (!falRes.ok) {
      const msg = data?.detail?.[0]?.msg || data?.message || data?.error || `Model error (${falRes.status})`;
      return json({ error: msg }, falRes.status);
    }

    return json(data, 200);
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
