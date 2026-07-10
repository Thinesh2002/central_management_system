const { GoogleGenAI } = require("@google/genai");

let client = null;

function getGeminiClient() {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not set in the backend .env file.");
    error.statusCode = 500;
    throw error;
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

module.exports = { getGeminiClient };
