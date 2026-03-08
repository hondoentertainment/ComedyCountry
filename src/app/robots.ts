import { MetadataRoute } from "next";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile", "/following", "/settings", "/wrapped", "/feed"],
      },
      // Explicitly allow AI agent crawlers for search compatibility
      {
        userAgent: "GPTBot",
        allow: ["/", "/api/discover"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/api/discover"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/api/discover"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/api/discover"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
