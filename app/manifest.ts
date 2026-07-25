import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inside English",
    short_name: "InsideEnglish",
    description: "Премиум приложение для изучения английского через состояние осознанности.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D14",
    theme_color: "#0D0D14",
    orientation: "portrait",
    categories: ["education", "lifestyle", "health"],
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
