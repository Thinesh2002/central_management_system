const Anthropic = require("@anthropic-ai/sdk");

let client = null;

function getAnthropicClient() {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const error = new Error("ANTHROPIC_API_KEY is not set in the backend .env file.");
    error.statusCode = 500;
    throw error;
  }

  client = new Anthropic({ apiKey });
  return client;
}

module.exports = { getAnthropicClient };
