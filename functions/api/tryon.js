// functions/api/tryon.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. Verify environment variable is bound
    let apiKey = env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined") {
      return new Response(
        JSON.stringify({ 
          error: "Cloudflare Pages has not loaded GEMINI_API_KEY. Please add it to Settings -> Variables and secrets (Production) and REDEPLOY." 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Clean key of quotes or spaces
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    // 2. Validate that it's actually an API key
    if (apiKey.includes("apps.googleusercontent.com") || apiKey.startsWith("{")) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid key type: You provided an OAuth Client ID or Service Account. Please generate a standard API Key (starts with AIzaSy) from https://aistudio.google.com/app/apikey" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { prompt, image, mask, model = "gemini-3.1-flash-image" } = await request.json();

    if (!image || !mask) {
      return new Response(
        JSON.stringify({ error: "Missing original photo or suit image." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Make request to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/webp",
                  data: image,
                },
              },
              {
                inline_data: {
                  mime_type: "image/webp",
                  data: mask,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await geminiRes.json();

    return new Response(JSON.stringify(data), {
      status: geminiRes.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
