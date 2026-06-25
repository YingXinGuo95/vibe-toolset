import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import logger from "@/lib/logger";
import {
  checkTimeout,
  formatGameForClient,
  type GomokuGameRow,
} from "@/lib/gomoku/game";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

const POLL_INTERVAL_MS = 1000;
const WAIT_TIMEOUT_MS = 8000;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "GET /api/gomoku/rooms/[shortCode]/wait" });

  try {
    const { shortCode } = await params;
    const { searchParams } = new URL(request.url);
    const lastVersionParam = searchParams.get("lastVersion");
    const lastVersion = lastVersionParam ? parseInt(lastVersionParam, 10) : -1;

    const supabase = createServiceClient();
    const start = Date.now();
    const deadline = start + WAIT_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const { data: game, error } = await supabase
        .from("gomoku_games")
        .select("*")
        .eq("short_code", shortCode)
        .single();

      if (error || !game) {
        return NextResponse.json(
          { ok: false, error: "Room not found" },
          { status: 404 },
        );
      }

      const typedGame = game as GomokuGameRow;

      log.info(
        {
          shortCode,
          lastVersion,
          dbVersion: typedGame.version,
          status: typedGame.status,
          elapsed: Date.now() - start,
        },
        "wait poll tick",
      );

      const timeout = checkTimeout(typedGame);
      if (timeout.timedOut) {
        await supabase
          .from("gomoku_games")
          .update({
            status: "finished",
            winner: timeout.winner,
            version: typedGame.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", typedGame.id);

        return NextResponse.json({
          ok: true,
          game: formatGameForClient({
            ...typedGame,
            status: "finished",
            winner: timeout.winner ?? null,
          }),
          timedOut: true,
        });
      }

      if (typedGame.version > lastVersion) {
        return NextResponse.json({
          ok: true,
          game: formatGameForClient(typedGame),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    log.info({ shortCode, lastVersion }, "wait timeout, returning empty");

    return NextResponse.json({ ok: true, game: null });
  } catch (err) {
    log.error({ err }, "wait error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
