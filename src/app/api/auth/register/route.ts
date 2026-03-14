import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applyRateLimit, getClientAddress, jsonError, jsonResponse, logError } from "@/lib/api";

const MIN_USERNAME_LEN = 3;
const MAX_USERNAME_LEN = 32;
const MIN_PASSWORD_LEN = 8;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, getClientAddress(request), {
    prefix: "auth-register",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const username = (body.username ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();

    if (!username || !password) {
      return jsonError(request, 400, "Username and password are required");
    }
    if (username.length < MIN_USERNAME_LEN) {
      return jsonError(request, 400, `Username must be at least ${MIN_USERNAME_LEN} characters`);
    }
    if (username.length > MAX_USERNAME_LEN) {
      return jsonError(request, 400, `Username must be at most ${MAX_USERNAME_LEN} characters`);
    }
    if (!USERNAME_REGEX.test(username)) {
      return jsonError(
        request,
        400,
        "Username can only contain letters, numbers, underscores, and hyphens"
      );
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return jsonError(request, 400, `Password must be at least ${MIN_PASSWORD_LEN} characters`);
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      return jsonError(request, 409, "Username is already taken");
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        name: username,
        passwordHash,
      },
    });

    return jsonResponse(request, {
      id: user.id,
      username: user.username,
    });
  } catch (e) {
    logError(request, "Registration failed", e);
    return jsonError(request, 500, "Registration failed");
  }
}
