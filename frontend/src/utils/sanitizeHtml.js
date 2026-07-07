import DOMPurify from "dompurify";

export function sanitizeHtml(html) {
  if (!html) return "";

  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
      "ul", "ol", "li", "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "style", "class", "colspan", "rowspan"],
    ALLOW_DATA_ATTR: false,
  });
}
