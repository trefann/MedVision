import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedVision",
    short_name: "MedVision",
    description: "Oral lesion surveillance for frontline health workers",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#0C8C8C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
