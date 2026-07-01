// api/gemini.js
// Secure server-side proxy for Google Gemini API (Vercel Serverless Function).
// The API key is stored as a Vercel environment variable (GEMINI_API_KEY)
// and is NEVER exposed to the browser or the public GitHub repo.

export default async function handler(req, res) {

  // Set CORS headers to allow calls from the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Read the secret API key from Vercel environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key.' });
  }

  const requestBody = req.body;
  if (!requestBody) {
    return res.status(400).json({ error: 'Request body is missing.' });
  }

  // Forward the request to the real Google Gemini API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseData = await geminiResponse.json();
    return res.status(geminiResponse.status).json(responseData);

  } catch (error) {
    console.error('Proxy fetch error:', error);
    return res.status(502).json({ error: 'Failed to reach Gemini API.', details: error.message });
  }
}
