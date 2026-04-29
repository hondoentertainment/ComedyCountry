import { jsonResponse } from "@/lib/api";

export async function GET(request: Request) {
  return jsonResponse(request, {
    status: "ok",
    service: "punchline-atlas",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD(request: Request) {
  const response = jsonResponse(request, {});
  response.headers.delete("content-type");
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
