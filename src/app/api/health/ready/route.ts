import { jsonResponse } from "@/lib/api";
import { getReadinessSnapshot } from "@/lib/runtime-health";

export async function GET(request: Request) {
  const snapshot = await getReadinessSnapshot();
  return jsonResponse(request, snapshot, {
    status: snapshot.ready ? 200 : 503,
  });
}

export async function HEAD(request: Request) {
  const snapshot = await getReadinessSnapshot();
  const response = jsonResponse(
    request,
    {},
    {
      status: snapshot.ready ? 200 : 503,
    }
  );

  response.headers.delete("content-type");

  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
