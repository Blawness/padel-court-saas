/**
 * X/Twitter falls back to og:image when no twitter:image is present, but only after its
 * crawler has parsed the OG block — declaring it explicitly is cheaper and unambiguous.
 * Same 1200x630 canvas, so the OG artwork is reused verbatim.
 */
export { default, alt, size, contentType } from "./opengraph-image";
