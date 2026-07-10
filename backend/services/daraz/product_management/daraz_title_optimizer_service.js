const { getAnthropicClient } = require("../../ai/anthropic_client");

const MODEL = "claude-opus-4-8";

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
  additionalProperties: false,
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
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: OUTPUT_SCHEMA,
      },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(product, avoidTitles) }],
  });

  if (response.stop_reason === "refusal") {
    const error = new Error("Claude declined to generate a title suggestion for this product.");
    error.statusCode = 422;
    throw error;
  }

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock) {
    const error = new Error("Claude returned no text content.");
    error.statusCode = 502;
    throw error;
  }

  const parsed = JSON.parse(textBlock.text);

  return { title: parsed.title, reasoning: parsed.reasoning };
}

module.exports = { generateTitleSuggestion };
