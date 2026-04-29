import type { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";

export type RequestContext = {
  requestId: string;
  correlationId: string;
  method?: string;
  path?: string;
  clientAddress?: string;
  userAgent?: string;
};

const requestContextCache = new WeakMap<Request, RequestContext>();

function resolveHeaders(input: Request | Headers) {
  return input instanceof Headers ? input : input.headers;
}

function resolveRequestId(headers: Headers) {
  return (
    headers.get(REQUEST_ID_HEADER) ??
    headers.get(CORRELATION_ID_HEADER) ??
    crypto.randomUUID()
  );
}

export function getRequestId(input: Request | Headers) {
  if (input instanceof Request) {
    return getRequestContext(input).requestId;
  }
  return resolveRequestId(resolveHeaders(input));
}

export function getCorrelationId(input: Request | Headers) {
  if (input instanceof Request) {
    return getRequestContext(input).correlationId;
  }

  const headers = resolveHeaders(input);
  return headers.get(CORRELATION_ID_HEADER) ?? resolveRequestId(headers);
}

export function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getRequestContext(request: Request): RequestContext {
  const cached = requestContextCache.get(request);
  if (cached) {
    return cached;
  }

  const headers = request.headers;
  const requestId = resolveRequestId(headers);
  const correlationId = headers.get(CORRELATION_ID_HEADER) ?? requestId;
  const url = new URL(request.url);

  const context = {
    requestId,
    correlationId,
    method: request.method,
    path: url.pathname,
    clientAddress: getClientAddress(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  };

  requestContextCache.set(request, context);
  return context;
}

export function setRequestContextHeaders(headers: Headers, context: RequestContext) {
  headers.set(REQUEST_ID_HEADER, context.requestId);
  headers.set(CORRELATION_ID_HEADER, context.correlationId);
  return headers;
}

export function applyRequestContextHeaders(
  response: Response | NextResponse,
  requestOrContext: Request | RequestContext
) {
  const context =
    requestOrContext instanceof Request ? getRequestContext(requestOrContext) : requestOrContext;

  response.headers.set(REQUEST_ID_HEADER, context.requestId);
  response.headers.set(CORRELATION_ID_HEADER, context.correlationId);
  return response;
}
