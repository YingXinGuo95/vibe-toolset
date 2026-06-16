import { NextRequest, NextResponse } from "next/server";
import { findUserByCredentials, toSafeUser } from "@/lib/auth/stub-users";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "POST /api/auth/login" });

  try {
    const body = await request.json();
    const { email, password } = body;

    log.info({ email }, "login attempt");

    if (!email || !password) {
      log.warn({ email }, "login failed: missing credentials");
      return NextResponse.json(
        { ok: false, error: "errorInvalidCredentials" },
        { status: 400 }
      );
    }

    const user = findUserByCredentials(email, password);

    if (!user) {
      log.warn({ email }, "login failed: invalid credentials");
      return NextResponse.json(
        { ok: false, error: "errorInvalidCredentials" },
        { status: 401 }
      );
    }

    const safeUser = toSafeUser(user);

    log.info({ userId: safeUser.id, email }, "login successful");

    const response = NextResponse.json({ ok: true, user: safeUser });

    // Set session cookie (non-httpOnly so client JS can read for session restoration)
    response.cookies.set("session", JSON.stringify(safeUser), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    log.error({ err }, "login error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
