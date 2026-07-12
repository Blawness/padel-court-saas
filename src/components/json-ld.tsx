/**
 * Structured data for search engines. Google reads JSON-LD out of a plain script tag, so this
 * renders on the server with no client cost.
 *
 * The content is built by us from our own database — never from user-supplied HTML — and
 * JSON.stringify escapes the values, so there is nothing for a venue name to inject here.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
