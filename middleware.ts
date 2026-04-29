import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyRequestContextHeaders,
  getRequestContext,
  setRequestContextHeaders,
} from "@/lib/request-context";

export function middleware(request: NextRequest) {
  const requestContext = getRequestContext(request);
  const requestHeaders = setRequestContextHeaders(new Headers(request.headers), requestContext);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applyRequestContextHeaders(response, requestContext);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js).*)"],
};
