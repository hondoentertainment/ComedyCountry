import { MetadataRoute } from "next";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile", "/following", "/settings"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
