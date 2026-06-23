import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BLACK,
  WHITE,
  checkTimeout,
  formatGameForClient,
  type GomokuGameRow,
} from "@/lib/gomoku/game";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { shortCode } = await params;
    const { searchParams } = new URL(request.url);
    const playerToken = searchParams.get("playerToken");

    if (!playerToken) {
      return NextResponse.json(
        { ok: false, error: "playerToken is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

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

      typedGame.status = "finished";
      typedGame.winner = timeout.winner ?? null;
      typedGame.version += 1;
    }

    let player: "black" | "white" | null = null;

    if (typedGame.black_player === playerToken) {
      player = "black";
    } else if (typedGame.white_player === playerToken) {
      player = "white";
    } else {
      // Current token is not a player in this room. Check whether the player
      // already has another unfinished game before allowing them to join.
      const { data: ongoingGame, error: ongoingError } = await supabase
        .from("gomoku_games")
        .select("short_code")
        .or(`black_player.eq.${playerToken},white_player.eq.${playerToken}`)
        .neq("status", "finished")
        .neq("short_code", shortCode)
        .maybeSingle();

      if (ongoingError) {
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

      if (typedGame.black_player && typedGame.white_player) {
        // Room already has two players and current browser is not one of them.
        return NextResponse.json({
          ok: true,
          isFull: true,
        });
      } else if (!typedGame.black_player) {
        player = "black";
        await supabase
          .from("gomoku_games")
          .update({
            black_player: playerToken,
            version: typedGame.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", typedGame.id);
        typedGame.black_player = playerToken;
        typedGame.version += 1;
      } else if (!typedGame.white_player && typedGame.status !== "finished") {
        player = "white";
        await supabase
          .from("gomoku_games")
          .update({
            white_player: playerToken,
            status: "playing",
            last_move_at: new Date().toISOString(),
            version: typedGame.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", typedGame.id);
        typedGame.white_player = playerToken;
        typedGame.status = "playing";
        typedGame.last_move_at = new Date().toISOString();
        typedGame.version += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      game: formatGameForClient(typedGame),
      player,
      isFull: false,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
