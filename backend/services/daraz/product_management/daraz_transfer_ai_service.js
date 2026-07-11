const { getGeminiClient } = require("../../ai/gemini_client");
const { callGeminiWithRetry } = require("../../ai/gemini_retry");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const TRANSIENT_RETRIES = 2;

const SYSTEM_PROMPT = `You write Daraz (a Southeast/South Asian e-commerce marketplace) product listing content from a product's existing data.

Rules:
- Only use facts present in the given product data (name, existing description, category, brand, attribute fields). Never invent specifications, materials, dimensions, or claims that aren't supported by what's given.
- Titles: Brand + Product Type + Key Feature(s) + Model/Variant (in that rough order). Include the 2-3 keywords a buyer would actually search for. Under 255 characters, prefer 60-150. No ALL CAPS, no excessive punctuation, no promotional spam.
- Descriptions: 2-4 short HTML paragraphs (<p> tags only, no markdown, no <html>/<body> wrapper), highlighting real features and use-cases from the given data.
- When more than one storefront account is listed, generate a SEPARATE title and description for each one, in the same order given. Each must describe the exact same product accurately, but be worded meaningfully differently from the others (different phrasing, different feature emphasis/order) so no two storefronts read as duplicate content. With only one account, just write the single best version.
- For the requested attribute fields: fill in only the ones you can confidently infer from the product's existing name/description/category/brand. Skip (omit from the output) any field you cannot support with real evidence from the given data — do not guess. For a field that looks like a bullet-point "highlights" or "key features" list, write 3-6 short phrases separated by newlines.
- Keep the original language of the product's existing title/description (do not translate).`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      description: "One title+description per account, in the same order the accounts were given.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description_html: { type: "string" },
        },
        required: ["title", "description_html"],
      },
    },
    attributes: {
      type: "array",
      description: "Best-guess values for the requested attribute fields. Omit any field you can't confidently infer.",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "The attribute key exactly as given in the prompt." },
          value: { type: "string" },
        },
        required: ["key", "value"],
      },
    },
  },
  required: ["variants", "attributes"],
};

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUserMessage({ product, accountNames, categoryName, brand, attributeFields, existingDescription }) {
  const lines = [
    `Current title: ${product.product_name || product.title || product.name || "(none)"}`,
    existingDescription ? `Current description: ${stripHtml(existingDescription).slice(0, 1500)}` : null,
    categoryName ? `Daraz category: ${categoryName}` : null,
    brand ? `Brand: ${brand}` : null,
    "",
    `Generate content for these ${accountNames.length} Daraz storefront account(s), in this exact order:`,
    ...accountNames.map((name, index) => `${index + 1}. ${name}`),
  ].filter((line) => line !== null);

  if (attributeFields.length) {
    lines.push("", "Also fill in these attribute fields where you can confidently infer a value:");
    attributeFields.forEach((field) => {
      lines.push(
        `- key="${field.key}", label="${field.label}"${field.existingValue ? `, current value="${field.existingValue}"` : ""}`
      );
    });
  }

  return lines.join("\n");
}

async function generateTransferContent({
  product,
  accountNames = [],
  categoryName = "",
  brand = "",
  attributeFields = [],
  existingDescription = "",
}) {
  if (!accountNames.length) {
    const error = new Error("At least one account name is required.");
    error.statusCode = 400;
    throw error;
  }

  const client = getGeminiClient();

  const response = await callGeminiWithRetry(
    client,
    {
      model: MODEL,
      contents: buildUserMessage({ product, accountNames, categoryName, brand, attributeFields, existingDescription }),
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
        ? "Gemini declined to generate content for this product (safety filter)."
        : "Gemini returned no content for this product."
    );
    error.statusCode = finishReason === "SAFETY" ? 422 : 502;
    throw error;
  }

  const parsed = JSON.parse(text);

  const variants = (parsed.variants || []).map((variant, index) => ({
    accountName: accountNames[index] || null,
    title: variant.title || "",
    descriptionHtml: variant.description_html || "",
  }));

  const attributes = {};
  (parsed.attributes || []).forEach((entry) => {
    if (entry?.key && entry.value !== undefined && entry.value !== null && entry.value !== "") {
      attributes[entry.key] = entry.value;
    }
  });

  return { variants, attributes };
}

module.exports = { generateTransferContent };
