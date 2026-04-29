import { applyRequestContextHeaders } from "@/lib/request-context";

export async function GET(request: Request) {
  return applyRequestContextHeaders(
    new Response(null, {
      status: 204,
    }),
    request
  );
}

export const HEAD = GET;
