import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Punchline Atlas",
    short_name: "Punchline Atlas",
    description: "The nationwide comedy intelligence platform — discover venues, track comedian tours, and never miss a show.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#D4AF37",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["entertainment", "events"],
  };
}
