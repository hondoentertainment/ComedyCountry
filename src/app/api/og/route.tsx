import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/og?title=...&subtitle=...&type=comedian|venue|event
 *
 * Dynamic Open Graph image generation for social sharing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Punchline Atlas";
  const subtitle = searchParams.get("subtitle") || "Find comedy. Anywhere.";
  const type = searchParams.get("type") || "default";

  const accentColors: Record<string, string> = {
    comedian: "#d4a843",
    venue: "#22c55e",
    event: "#8b5cf6",
    default: "#d4a843",
  };
  const accent = accentColors[type] || accentColors.default;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: "80px", height: "4px", background: accent, marginBottom: "24px", borderRadius: "2px" }} />

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? "48px" : "64px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.1,
            maxWidth: "900px",
            marginBottom: "16px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#999",
            maxWidth: "700px",
          }}
        >
          {subtitle}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "auto",
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: accent }} />
          <div style={{ fontSize: "24px", color: accent, fontWeight: 600 }}>Punchline Atlas</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
