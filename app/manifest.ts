import type { MetadataRoute } from "next";

/**
 * PWA manifest. Served at `/manifest.webmanifest` and linked automatically.
 *
 * `theme_color` matches the light canvas the app actually renders on, so the
 * browser chrome does not disagree with the page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROBACHA — Rob the Gacha on Robinhood Chain",
    short_name: "ROBACHA",
    description: "The memecoin gacha built for Robinhood Chain.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#f7f8f3",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
