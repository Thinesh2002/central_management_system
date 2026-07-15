const { getGeminiClient } = require("../../ai/gemini_client");
const { callGeminiWithRetry } = require("../../ai/gemini_retry");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const TRANSIENT_RETRIES = 2;

// One combined call generates highlights/description/features/keywords/
// qualitative scores together - same input data serves all of them, and
// a bulk scan of hundreds of products makes 5 separate calls per product
// costly in both latency and API spend for no real accuracy benefit.
const SYSTEM_PROMPT = `You are a Daraz (Southeast/South Asian e-commerce marketplace) listing content specialist analyzing one existing product listing and producing improved content plus a qualitative content-quality assessment.

Rules:
- Only use facts present in the given product data (title, existing description, category, brand, attributes). Never invent specifications, materials, dimensions, certifications, or claims not supported by what's given.
- Highlights: 5-8 short, benefit-oriented, customer-facing bullet points. No duplicate information between them. Mobile-friendly length (under ~90 characters each).
- Description: Daraz-compatible HTML using only <p>, <ul>, <li>, <strong>, <h4> tags (no <html>/<body>/<script>/inline styles). 3-5 short paragraphs plus a bullet list of key specs. Also provide a plain-text version with tags stripped.
- Warranty/package-includes/care-instructions sections: only write these if the given data supports a real answer; otherwise return an empty string for that field - do not invent warranty terms or package contents.
- FAQ: 2-4 realistic buyer questions with honest answers grounded in the given data only.
- Extracted features: only fields you can confidently infer from the given title/description/attributes (material, color, weight, dimensions, voltage, power, capacity, compatibility, package contents, warranty, certification, country of origin). Omit any field you cannot support with real evidence - do not guess.
- Keywords: a mix of primary, secondary, long-tail, and buyer-intent search terms a real buyer would type, each with a priority (high/medium/low) and a one-line recommendation on where/how to use it. Do not invent search-volume or competition numbers - you don't have real search data, only give qualitative priority.
- Scores (0-100 integers, be a strict, honest grader - do not default to high numbers): seo (keyword usage/placement quality in the current title+description), conversion (how compelling/benefit-driven the current content reads to a buyer, not a real conversion-rate prediction), readability (sentence/paragraph clarity), grammar (current title+description's grammatical correctness), keyword (keyword diversity/relevance already present in current content).
- Keep the original language of the product's existing title/description (do not translate).`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    highlights: { type: "array", items: { type: "string" } },
    highlights_reasoning: { type: "string" },
    description_html: { type: "string" },
    description_plain: { type: "string" },
    warranty_section: { type: "string" },
    package_includes: { type: "string" },
    care_instructions: { type: "string" },
    faq: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
    extracted_features: {
      type: "array",
      items: {
        type: "object",
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"],
      },
    },
    keywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          type: { type: "string", description: "primary | secondary | long_tail | buyer_intent" },
          priority: { type: "string", description: "high | medium | low" },
          recommendation: { type: "string" },
        },
        required: ["keyword", "type", "priority"],
      },
    },
    scores: {
      type: "object",
      properties: {
        seo: { type: "integer" },
        conversion: { type: "integer" },
        readability: { type: "integer" },
        grammar: { type: "integer" },
        keyword: { type: "integer" },
      },
      required: ["seo", "conversion", "readability", "grammar", "keyword"],
    },
  },
  required: [
    "highlights",
    "description_html",
    "description_plain",
    "extracted_features",
    "keywords",
    "scores",
  ],
};

// Daraz's attribute key for a "Highlights"/"Key Features" bullet-point
// field varies per category and was never independently confirmed for
// this account's categories, so this checks a few plausible spellings
// rather than assuming one - same defensive pattern used throughout the
// Daraz integration for uncertain field names.
const HIGHLIGHT_ATTRIBUTE_KEYS = ["Highlights", "highlights", "Key Features", "KeyFeatures", "key_features"];

function getExistingHighlights(product) {
  const attributes = product.attributes_json || {};
  const key = HIGHLIGHT_ATTRIBUTE_KEYS.find((candidate) => attributes[candidate]);
  if (!key) return [];

  const raw = attributes[key];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUserMessage(product) {
  const attributes = product.attributes_json || {};
  const attributeLines = Object.entries(attributes)
    .slice(0, 30)
    .map(([key, value]) => `- ${key}: ${String(value).slice(0, 200)}`);

  return [
    `Title: ${product.name || "(none)"}`,
    product.brand ? `Brand: ${product.brand}` : null,
    product.primary_category ? `Category: ${product.primary_category}` : null,
    product.seller_sku ? `Seller SKU: ${product.seller_sku}` : null,
    product.short_description
      ? `Current description: ${stripHtml(product.short_description).slice(0, 2000)}`
      : "Current description: (none)",
    attributeLines.length ? "Current attributes:" : null,
    ...attributeLines,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateContentSuggestion(product) {
  const client = getGeminiClient();

  const response = await callGeminiWithRetry(
    client,
    {
      model: MODEL,
      contents: buildUserMessage(product),
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
        ? "Gemini declined to analyze this product's content (safety filter)."
        : "Gemini returned no content for this product."
    );
    error.statusCode = finishReason === "SAFETY" ? 422 : 502;
    throw error;
  }

  const parsed = JSON.parse(text);

  return {
    originalHighlights: getExistingHighlights(product),
    suggestedHighlights: parsed.highlights || [],
    highlightsReasoning: parsed.highlights_reasoning || "",
    originalDescription: product.short_description || "",
    suggestedDescription: parsed.description_plain || "",
    suggestedDescriptionHtml: parsed.description_html || "",
    descriptionSections: {
      warranty: parsed.warranty_section || "",
      packageIncludes: parsed.package_includes || "",
      careInstructions: parsed.care_instructions || "",
      faq: parsed.faq || [],
    },
    extractedFeatures: parsed.extracted_features || [],
    keywords: parsed.keywords || [],
    aiScores: parsed.scores || {},
  };
}

module.exports = { generateContentSuggestion, getExistingHighlights };
