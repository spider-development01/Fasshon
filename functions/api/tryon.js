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

  const { prompt, image_urls } = body || {};

  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'Missing or invalid "prompt".' }, 400);
  }
  if (!Array.isArray(image_urls) || image_urls.length === 0) {
    return json({ error: 'Missing or empty "image_urls" array.' }, 400);
  }

  // Fal Nano Banana accepts only clean prompt, image_urls, and generation options
  const payload = {
    prompt: prompt.trim(),
    image_urls: image_urls.filter(Boolean),
    num_images: 1,
    output_format: 'jpeg',
  };

  // Primary endpoint + fallback endpoint if route is unavailable
  const endpoints = [
    'https://fal.run/fal-ai/gemini-25-flash-image/edit',
    'https://fal.run/fal-ai/nano-banana/edit',
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const falRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await falRes.json().catch(() => ({}));

      if (!falRes.ok) {
        lastError = data?.detail?.[0]?.msg || data?.message || data?.error || `Fal error (${falRes.status})`;
        continue; // Try secondary endpoint if available
      }

      // CRITICAL FIX: Extract the generated URL into data.output for the frontend
      const outputUrl = 
        data?.images?.[0]?.url || 
        data?.image?.url || 
        (Array.isArray(data?.output) ? data.output[0] : data?.output) ||
        data?.result;

      if (!outputUrl) {
        lastError = 'No image URL returned from AI model';
        continue;
      }

      return json({
        output: outputUrl, // <-- Matches frontend: if (data?.output)
        ...data,
      }, 200);

    } catch (err) {
      lastError = err?.message || 'Network error';
    }
  }

  return json({ error: 'Upstream generation failed: ' + lastError }, 502);
}

// Handle CORS Preflight if called across subdomains
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
