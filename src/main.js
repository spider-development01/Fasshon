export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ error: 'Method Not Allowed' }, 405);
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, image, mask, model = 'gemini-3.1-flash-image' } = body;
    
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
      error("Missing API Key in environment variables.");
      return res.json({ error: "Server Configuration Error" }, 500);
    }

    log(`Processing inpaint request for model: ${model}`);

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/webp', data: image } },
          { inline_data: { mime_type: 'image/webp', data: mask } }
        ]
      }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
      error(`Google API Error: ${data.error?.message || JSON.stringify(data)}`);
      return res.json({ error: data.error?.message || "Google API Error" }, response.status);
    }

    log("Image generated successfully!");
    return res.json(data, 200);

  } catch (err) {
    error(`Function crashed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
