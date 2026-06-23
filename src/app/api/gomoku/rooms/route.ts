import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import logger from "@/lib/logger";
import {
  BLACK,
  createEmptyBoard,
  generateShortCode,
  type GomokuGameRow,
} from "@/lib/gomoku/game";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? Date.now().toString(36);
  const log = logger.child({ requestId, api: "POST /api/gomoku/rooms" });

  try {
    const { playerToken } = (await request.json()) as { playerToken?: string };

    if (!playerToken) {
      return NextResponse.json(
        { ok: false, error: "playerToken is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Prevent a player from creating multiple games at the same time.
    const { data: ongoingGame, error: ongoingError } = await supabase
      .from("gomoku_games")
      .select("short_code")
      .or(`black_player.eq.${playerToken},white_player.eq.${playerToken}`)
      .neq("status", "finished")
      .maybeSingle();

    if (ongoingError) {
      log.error({ ongoingError }, "failed to check ongoing game");
      return NextResponse.json(
        { ok: false, error: "Failed to check ongoing game" },
        { status: 500 },
      );
    }

    if (ongoingGame) {
      return NextResponse.json({
        ok: false,
        error: "ONGOING_GAME",
        shortCode: ongoingGame.short_code,
      });
    }

    let attempts = 0;
    let game: GomokuGameRow | null = null;
    let lastError: unknown = null;

    while (!game && attempts < 5) {
      const shortCode = generateShortCode();
      const { data, error } = await supabase
        .from("gomoku_games")
        .insert({
          short_code: shortCode,
          black_player: playerToken,
          board: createEmptyBoard(),
        })
        .select()
        .single();

      if (!error) {
        game = data as GomokuGameRow;
      } else {
        lastError = error;
      }
      attempts++;
    }

    if (!game) {
      log.error({ lastError }, "failed to create room");
      return NextResponse.json(
        { ok: false, error: "Failed to create room" },
        { status: 500 },
      );
    }

    log.info({ shortCode: game.short_code }, "room created");

    return NextResponse.json({
      ok: true,
      shortCode: game.short_code,
      player: BLACK,
    });
  } catch (err) {
    log.error({ err }, "create room error");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
