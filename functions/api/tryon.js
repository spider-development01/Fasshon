// functions/api/tryon.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. Validate GEMINI_API_KEY
    let apiKey = env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined") {
      return new Response(
        JSON.stringify({ 
          error: "Cloudflare Pages has not loaded GEMINI_API_KEY. Add it to Settings -> Variables and secrets (Production) and redeploy." 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Clean key of quotes or spaces
    apiKey = apiKey.trim().replace(/^["']|["']$/g, "");

    const { prompt, image, refImage, model = "gemini-3.1-flash-image" } = await request.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Missing client photo." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Assemble Gemini Request with IMAGE-FIRST ordering
    const parts = [
      // Primary Client Image (Always First for identity conditioning)
      {
        inline_data: {
          mime_type: "image/jpeg",
          data: image,
        },
      }
    ];

    // Optional Custom Hairstyle Reference (From Pinterest / Camera roll)
    if (refImage) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: refImage,
        },
      });
    }

    // Text Prompt appended after the images
    parts.push({
      text: prompt,
    });

    // 3. Dispatch to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
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
