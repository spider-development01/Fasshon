// File: functions/api/tryon.js

export async function onRequestPost({ request, env }) {
  try {
    // Parse the request body sent from index.html
    const { prompt, image, mask, model } = await request.json();

    // The environment variable GEMINI_API_KEY must be set in your Cloudflare Pages dashboard
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Construct the Gemini API URL
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Format the payload for Gemini Vision/Image models
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image } },
            { inlineData: { mimeType: "image/jpeg", data: mask } }
          ]
        }
      ]
    };

    // Forward the request to Google
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Error from Gemini API" }), { 
        status: geminiResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Return the successful response back to the frontend
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
