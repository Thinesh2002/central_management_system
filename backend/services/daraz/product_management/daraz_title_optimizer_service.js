const { getGeminiClient } = require("../../ai/gemini_client");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 20000;

const SYSTEM_PROMPT = `You optimize product titles for Daraz (a Southeast/South Asian e-commerce marketplace) listings.

Daraz title guidelines:
- Structure: Brand + Product Type + Key Feature(s) + Model/Variant (in that rough order).
- Include the 2-3 keywords a buyer would actually search for (material, color, size, use-case) — this drives search ranking.
- Keep it under 255 characters. Prefer 60-150 characters — long enough to be descriptive, not a keyword-stuffed wall of text.
- No ALL CAPS, no excessive punctuation (!!!, ***), no promotional spam ("BEST PRICE", "SALE").
- Do not invent specifications, brand names, or claims not present in the original title/attributes.
- Keep the language the original title is in (do not translate).
- If the original title is already good, it is fine to suggest only a small refinement — don't force a rewrite for its own sake.
- If this exact product is also listed on other Daraz storefronts under different titles, your suggested title must be meaningfully different from those (not a near-duplicate) so each storefront reads as distinct, while still accurately describing the same product.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "The optimized product title." },
    reasoning: { type: "string", description: "One or two sentences on what changed and why." },
  },
  required: ["title", "reasoning"],
};

function buildUserMessage(product, avoidTitles = []) {
  const lines = [
    `Current title: ${product.name || "(none)"}`,
    product.brand ? `Brand: ${product.brand}` : null,
    product.primary_category ? `Category: ${product.primary_category}` : null,
    product.seller_sku ? `Seller SKU: ${product.seller_sku}` : null,
  ].filter(Boolean);

  if (avoidTitles.length) {
    lines.push(
      "This product is also listed on other Daraz storefronts under these titles — your suggestion must be meaningfully different from all of them:"
    );
    avoidTitles.forEach((title) => lines.push(`- ${title}`));
  }

  return lines.join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiRateLimit(error) {
  try {
    const parsed = typeof error.message === "string" ? JSON.parse(error.message) : null;
    if (parsed?.error?.code !== 429) return null;

    const retryDetail = (parsed.error.details || []).find((detail) =>
      String(detail["@type"] || "").includes("RetryInfo")
    );
    const seconds = retryDetail?.retryDelay ? parseFloat(retryDetail.retryDelay) : null;

    return { retryDelayMs: Number.isFinite(seconds) ? seconds * 1000 + 1000 : DEFAULT_RETRY_DELAY_MS };
  } catch {
    return null;
  }
}

async function callGemini(client, params, retriesLeft) {
  try {
    return await client.models.generateContent(params);
  } catch (error) {
    const rateLimit = parseGeminiRateLimit(error);

    if (rateLimit && retriesLeft > 0) {
      await sleep(rateLimit.retryDelayMs);
      return callGemini(client, params, retriesLeft - 1);
    }

    if (rateLimit) {
      const rateLimitError = new Error("Gemini rate limit exceeded for this scan. Try again in a minute, or scan fewer products at a time.");
      rateLimitError.statusCode = 429;
      throw rateLimitError;
    }

    throw error;
  }
}

async function generateTitleSuggestion(product, { avoidTitles = [] } = {}) {
  const client = getGeminiClient();

  const response = await callGemini(
    client,
    {
      model: MODEL,
      contents: buildUserMessage(product, avoidTitles),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: OUTPUT_SCHEMA,
      },
    },
    RATE_LIMIT_RETRIES
  );

  const text = response.text;

  if (!text) {
    const finishReason = response.candidates?.[0]?.finishReason;
    const error = new Error(
      finishReason === "SAFETY"
        ? "Gemini declined to generate a title suggestion for this product (safety filter)."
        : "Gemini returned no content for this product."
    );
    error.statusCode = finishReason === "SAFETY" ? 422 : 502;
    throw error;
  }

  const parsed = JSON.parse(text);

  return { title: parsed.title, reasoning: parsed.reasoning };
}

module.exports = { generateTitleSuggestion };
