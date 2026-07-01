// netlify/functions/gemini-proxy.js
// Secure server-side proxy for Google Gemini API.
// The API key is stored as a Netlify environment variable (GEMINI_API_KEY)
// and is NEVER exposed to the browser or the public GitHub repo.

exports.handler = async function (event, context) {

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Read the secret API key from Netlify environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server is not configured with a Gemini API key.' })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON in request body.' })
    };
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

    return {
      statusCode: geminiResponse.status,
      headers: {
        'Content-Type': 'application/json',
        // Allow calls from your GitHub Pages domain
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to reach Gemini API.', details: error.message })
    };
  }
};
