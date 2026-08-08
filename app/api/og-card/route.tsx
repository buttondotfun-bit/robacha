import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * The site's default social card, rendered as a PNG.
 *
 * Every page that is not a specific win used to fall back to /brand/og.svg —
 * whose own header comment said "replace with a rendered 1200x630 PNG before
 * launch", and which never was. X does not render SVG card images at all, so
 * every generic share (the spin-submitted share points at /app, links to the
 * home page, the docs, all of it) unfurled with no image. On a product whose
 * growth channel is people posting about it, that was a real hole.
 *
 * Rendered by the same machinery as the win card rather than shipped as a
 * static PNG, for the same reason the win card is: it is one source of truth
 * in code, it cannot drift from the design tokens written here, and there is
 * no binary asset to regenerate when the wording changes.
 *
 * Static content, so it is cached hard. Bump the wording here and the CDN
 * picks it up within a day; scrapers re-fetch on their own schedule anyway.
 */
/** Cap incoming text so a crafted query can't overflow the card. */
function clamp(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Per-page cards pass a headline + a small pill; both are sanitized and
  // length-capped. Absent, the card falls back to the site default.
  const headline = clamp(url.searchParams.get("title"), 42) ?? "Rob the Gacha.";
  const pill = clamp(url.searchParams.get("tag"), 28) ?? "Live on Robinhood Chain";
  const custom = url.searchParams.has("title");
  const subtitle = custom
    ? "Robacha · Robinhood Chain"
    : "Spin for real memecoins. Every draw provable on chain.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #fbfdf7 0%, #f2f5ec 55%, #f2ffd0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#10110f",
            }}
          >
            ROBACHA
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              background: "#ffffff",
              color: "#4e6600",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {pill}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          {/* The capsule, drawn from the brand's own three colours. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 220,
              height: 220,
              borderRadius: 110,
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(16,17,15,0.18)",
            }}
          >
            <div style={{ display: "flex", flex: 1, background: "#ff77ac" }} />
            <div style={{ display: "flex", height: 14, background: "#ffffff" }} />
            <div style={{ display: "flex", flex: 1, background: "#fbfcf8" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#10110f",
                lineHeight: 1.05,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 32,
                color: "#5b6157",
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 24, color: "#8b9086" }}>
            Odds, prizes and every round — published from the contract
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#10110f" }}>
            robacha.fun
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
