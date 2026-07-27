import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { iconUrlFor } from "@/lib/server/robinhood-tokens";

export const runtime = "nodejs";

/**
 * Token icon proxy, keyed by contract address.
 *
 * Token icons on Robinhood Chain are hosted on whatever domain each project
 * chose, several of which are operator-controlled. Rather than adding those to
 * the `next/image` allowlist — which would let any of them become a permitted
 * image source for the whole app — this route resolves the URL server-side from
 * the explorer's own listing and streams the bytes back from our origin.
 *
 * The caller supplies an **address**, never a URL, so this cannot be pointed at
 * an arbitrary host. Only what the explorer published for that token is ever
 * fetched, and only image content types are passed through.
 */

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

const MAX_BYTES = 512 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const upstream = await iconUrlFor(address);
  if (!upstream) {
    return NextResponse.json({ error: "no icon for this token" }, { status: 404 });
  }

  try {
    const response = await fetch(upstream, {
      headers: { accept: "image/*" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);

    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "not an image" }, { status: 415 });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "icon too large" }, { status: 413 });
    }

    return new NextResponse(bytes, {
      headers: {
        "content-type": type,
        "content-length": String(bytes.byteLength),
        // Icons change rarely; cache hard so the orbit never waits on upstream.
        "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "icon unavailable" }, { status: 502 });
  }
}
