const { getGeminiClient } = require("../../ai/gemini_client");
const { callGeminiWithRetry } = require("../../ai/gemini_retry");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const TRANSIENT_RETRIES = 2;

const TITLE_MIN_LENGTH = 150;
const TITLE_MAX_LENGTH = 180;
const TITLE_LENGTH_RETRIES = 3;

const SYSTEM_PROMPT = `You optimize product titles for Daraz (a Southeast/South Asian e-commerce marketplace) listings, eBay-SEO style (long, keyword-rich titles that maximize search surface area).

Daraz title guidelines:
- Structure: Brand + Product Type + Key Feature(s) + Model/Variant + supporting keywords (in that rough order).
- The title MUST be between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters — this is a hard requirement, not a suggestion. Pad out a short original title with real, accurate keywords (material, color, size, use-case, compatibility, occasion) drawn only from the given data until it reaches this range; trim a too-long one without dropping the core Brand/Product Type. Count characters before responding.
- Include every keyword a buyer would actually search for that the range allows — this drives search ranking.
- No ALL CAPS, no excessive punctuation (!!!, ***), no promotional spam ("BEST PRICE", "SALE").
- Do not invent specifications, brand names, or claims not present in the original title/attributes.
- Keep the language the original title is in (do not translate).
- If this exact product is also listed on other Daraz storefronts under different titles, your suggested title must be meaningfully different from those (not a near-duplicate) so each storefront reads as distinct, while still accurately describing the same product.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "The optimized product title." },
    reasoning: { type: "string", description: "One or two sentences on what changed and why." },
  },
  required: ["title", "reasoning"],
};

function buildUserMessage(product, avoidTitles = [], previousAttempt = null) {
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

  if (previousAttempt) {
    lines.push(
      `Your previous attempt was ${previousAttempt.length} characters, which is outside the required ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} range: "${previousAttempt.title}". Rewrite it to land inside that range this time.`
    );
  }

  return lines.join("\n");
}

async function requestTitle(product, avoidTitles, previousAttempt) {
  const client = getGeminiClient();

  const response = await callGeminiWithRetry(
    client,
    {
      model: MODEL,
      contents: buildUserMessage(product, avoidTitles, previousAttempt),
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

function isInRange(title) {
  const length = String(title || "").length;
  return length >= TITLE_MIN_LENGTH && length <= TITLE_MAX_LENGTH;
}

// The model is instructed to hit a hard 150-180 char range, but LLMs
// don't reliably self-count characters - re-prompting with the exact
// miss ("you were N chars, need 150-180") converges far more reliably
// than a single shot, without the cost of always running max attempts.
async function generateTitleSuggestion(product, { avoidTitles = [] } = {}) {
  let attempt = null;
  let lastResult = null;

  for (let i = 0; i < TITLE_LENGTH_RETRIES; i += 1) {
    lastResult = await requestTitle(product, avoidTitles, attempt);
    if (isInRange(lastResult.title)) return lastResult;
    attempt = lastResult;
  }

  return lastResult;
}

module.exports = { generateTitleSuggestion, TITLE_MIN_LENGTH, TITLE_MAX_LENGTH };
