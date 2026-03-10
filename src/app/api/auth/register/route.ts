import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const MIN_USERNAME_LEN = 3;
const MAX_USERNAME_LEN = 32;
const MIN_PASSWORD_LEN = 8;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    if (username.length < MIN_USERNAME_LEN) {
      return NextResponse.json(
        { error: `Username must be at least ${MIN_USERNAME_LEN} characters` },
        { status: 400 }
      );
    }
    if (username.length > MAX_USERNAME_LEN) {
      return NextResponse.json(
        { error: `Username must be at most ${MAX_USERNAME_LEN} characters` },
        { status: 400 }
      );
    }
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, periods, underscores, and hyphens" },
        { status: 400 }
      );
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LEN} characters` },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        name: username,
        passwordHash,
      },
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
    });
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
