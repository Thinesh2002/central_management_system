// Rule-based (non-AI) pieces of the content-optimization report: these are
// derived from real, present data (field presence, counts, live Daraz
// category-attribute requirements) rather than an AI guess, so they stay
// consistent and auditable even if the AI-scored pieces vary between runs.

const MIN_HIGHLIGHTS = 5;
const MIN_IMAGES = 3;
const MIN_DESCRIPTION_CHARS = 200;

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countImages(product) {
  const images = Array.isArray(product.images_json) ? product.images_json : [];
  return images.length + (product.main_image ? 1 : 0);
}

// Daraz's category-attribute response field names weren't independently
// confirmed against a live sandbox response (same caveat as the Daraz
// Transfer feature's dynamic attribute form) - this reads defensively
// across a few plausible spellings rather than assuming one shape.
function extractAttributeDefinitions(categoryAttributesResponse) {
  const result = categoryAttributesResponse?.data?.result || categoryAttributesResponse?.data || {};
  const list =
    result.data?.attributes ||
    result.attributes ||
    result.data ||
    (Array.isArray(result) ? result : []);

  if (!Array.isArray(list)) return [];

  return list
    .map((def) => ({
      key: def.key || def.attribute_id || def.name || def.attribute_name || null,
      label: def.name || def.attribute_name || def.display_name || def.label || def.key || "Unnamed attribute",
      mandatory: Boolean(def.is_mandatory ?? def.isMandatory ?? def.required ?? def.mandatory ?? false),
    }))
    .filter((def) => def.key);
}

function validateAttributes(product, categoryAttributesResponse) {
  const definitions = extractAttributeDefinitions(categoryAttributesResponse);
  const productAttributes = product.attributes_json || {};
  const productKeys = Object.keys(productAttributes);

  const missing = definitions
    .filter((def) => def.mandatory && !productAttributes[def.key])
    .map((def) => def.label);

  const incorrect = definitions
    .filter((def) => productAttributes[def.key] !== undefined && String(productAttributes[def.key]).trim() === "")
    .map((def) => def.label);

  const seen = new Set();
  const duplicate = productKeys.filter((key) => {
    const normalized = key.trim().toLowerCase();
    if (seen.has(normalized)) return true;
    seen.add(normalized);
    return false;
  });

  return { missing, incorrect, duplicate, totalDefinitions: definitions.length };
}

// Completeness/compliance are computed here (not by the AI) since they're
// pure field-presence/count checks against real data - keeping them
// rule-based means they can't drift between identical scans the way an AI
// re-grading the same content twice might.
function scoreCompleteness(product, generated) {
  const checks = [
    Boolean(product.name && product.name.length >= 15),
    Boolean(product.brand),
    stripHtml(product.short_description).length >= MIN_DESCRIPTION_CHARS,
    (generated?.originalHighlights?.length || 0) >= MIN_HIGHLIGHTS,
    countImages(product) >= MIN_IMAGES,
    Boolean(product.primary_category),
    Number(product.price) > 0,
    Number(product.quantity) > 0,
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function scoreCompliance(product, attributeValidation) {
  const checks = [
    Boolean(product.brand),
    Boolean(product.primary_category),
    attributeValidation.missing.length === 0,
    attributeValidation.duplicate.length === 0,
    String(product.status || "").toLowerCase() === "active",
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

// Weighted blend of rule-based (real, objective) and AI-scored
// (qualitative) metrics into one headline number.
const SCORE_WEIGHTS = {
  completeness: 0.2,
  compliance: 0.15,
  seo: 0.2,
  keyword: 0.15,
  readability: 0.1,
  grammar: 0.1,
  conversion: 0.1,
};

function computeOverallScore(scores) {
  const total = Object.entries(SCORE_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (Number(scores[key]) || 0) * weight,
    0
  );

  return Math.round(total);
}

function buildRecommendations({ product, generated, attributeValidation, scores }) {
  const critical = [];
  const high = [];
  const medium = [];
  const low = [];

  if (!product.brand) critical.push("Missing brand");
  attributeValidation.missing.forEach((label) => critical.push(`Missing mandatory attribute: ${label}`));
  if (countImages(product) < MIN_IMAGES) critical.push(`Only ${countImages(product)} image(s) - Daraz listings need at least ${MIN_IMAGES}`);

  if (scores.seo < 60) high.push("Title/description keyword usage is weak - review the AI title and keyword suggestions");
  if ((generated?.keywords?.length || 0) === 0) high.push("No search keywords identified for this listing");
  if (attributeValidation.duplicate.length) high.push(`Duplicate attribute keys: ${attributeValidation.duplicate.join(", ")}`);

  if (stripHtml(product.short_description).length < MIN_DESCRIPTION_CHARS) medium.push("Description is short - descriptions are written/uploaded manually, AI does not generate them");

  if (countImages(product) < MIN_IMAGES + 3) low.push("Add a few more product images (lifestyle/usage angles)");

  return { critical, high, medium, low };
}

function buildPublishingChecklist(product, generated, attributeValidation) {
  const items = [
    { label: "Title complete", passed: Boolean(product.name && product.name.length >= 15) },
    { label: "Description complete", passed: stripHtml(product.short_description).length >= MIN_DESCRIPTION_CHARS },
    { label: "Highlights complete", passed: (generated?.originalHighlights?.length || 0) >= MIN_HIGHLIGHTS },
    { label: "Images valid", passed: countImages(product) >= MIN_IMAGES },
    { label: "Attributes complete", passed: attributeValidation.missing.length === 0 },
    { label: "Category correct", passed: Boolean(product.primary_category) },
    { label: "Pricing valid", passed: Number(product.price) > 0 },
    { label: "Stock available", passed: Number(product.quantity) > 0 },
    { label: "Compliance passed", passed: attributeValidation.missing.length === 0 && attributeValidation.duplicate.length === 0 },
  ];

  const passedCount = items.filter((item) => item.passed).length;
  const readinessPercent = Math.round((passedCount / items.length) * 100);

  return { items, readinessPercent };
}

module.exports = {
  validateAttributes,
  scoreCompleteness,
  scoreCompliance,
  computeOverallScore,
  buildRecommendations,
  buildPublishingChecklist,
  countImages,
};
