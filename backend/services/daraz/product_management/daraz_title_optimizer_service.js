const { getGeminiClient } = require("../../ai/gemini_client");
const { callGeminiWithRetry } = require("../../ai/gemini_retry");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const TRANSIENT_RETRIES = 2;

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

async function generateTitleSuggestion(product, { avoidTitles = [] } = {}) {
  const client = getGeminiClient();

  const response = await callGeminiWithRetry(
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
    TRANSIENT_RETRIES
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
