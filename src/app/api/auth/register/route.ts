import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, type User } from "@/lib/auth/stub-users";
import logger from "@/lib/logger";

/** Ephemeral in-memory store for registered users (demo only). */
const registeredUsers: User[] = [];

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "POST /api/auth/register" });

  try {
    const body = await request.json();
    const { username, email, password } = body;

    log.info({ email, username }, "registration attempt");

    if (!username || !email || !password) {
      log.warn({ username, email }, "registration failed: missing fields");
      return NextResponse.json(
        { ok: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check stub users
    if (findUserByEmail(email)) {
      log.warn({ email }, "registration failed: email already exists");
      return NextResponse.json(
        { ok: false, error: "Email already in use" },
        { status: 409 }
      );
    }

    // Check registered users
    if (registeredUsers.some((u) => u.email === email)) {
      log.warn({ email }, "registration failed: email already registered");
      return NextResponse.json(
        { ok: false, error: "Email already in use" },
        { status: 409 }
      );
    }

    const user: User = {
      id: crypto.randomUUID?.() ?? registeredUsers.length.toString(),
      username,
      email,
    };

    registeredUsers.push(user);

    log.info({ userId: user.id, email }, "registration successful");

    const response = NextResponse.json({ ok: true, user });

    // Set session cookie
    response.cookies.set("session", JSON.stringify(user), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    log.error({ err }, "registration error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
