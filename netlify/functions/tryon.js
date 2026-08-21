// netlify/functions/tryon.js
exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { prompt, image, mask, model } = body;
    
    // Get your API key from Netlify Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY; 

    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing Gemini API Key in Netlify settings." }) };
    }

    // Google Gemini API URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${API_KEY}`;

    // Structure the request for Gemini
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: image } }, // The user's photo
            { inline_data: { mime_type: "image/jpeg", data: mask } }   // The suit/garment photo
          ]
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Error from Gemini API");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
