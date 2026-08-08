/**
 * Renders one or more JSON-LD structured-data blocks.
 *
 * A server component so the schema is in the initial HTML a crawler receives,
 * never injected after hydration. Callers pass plain objects built by the
 * helpers in lib/seo.ts; nothing here fabricates data.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
