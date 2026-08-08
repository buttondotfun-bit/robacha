import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Web app manifest. Kept lightweight — this is a browser tab identity and
 * add-to-homescreen convenience, not a full installable PWA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.defaultTitle,
    short_name: SITE.name,
    description: SITE.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#f7f8f3",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
