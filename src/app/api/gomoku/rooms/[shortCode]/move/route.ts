import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  WHITE,
  checkTimeout,
  checkWin,
  formatGameForClient,
  getCell,
  setCell,
  type GomokuGameRow,
  type Player,
} from "@/lib/gomoku/game";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ shortCode: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { shortCode } = await params;
    const body = (await request.json()) as {
      playerToken?: string;
      x?: number;
      y?: number;
    };

    if (!body.playerToken || body.x == null || body.y == null) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 },
      );
    }

    const { playerToken, x, y } = body;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      x < 0 ||
      x >= BOARD_SIZE ||
      y < 0 ||
      y >= BOARD_SIZE
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid coordinates" },
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

      return NextResponse.json(
        {
          ok: false,
          error: "Timeout",
          game: formatGameForClient({
            ...typedGame,
            status: "finished",
            winner: timeout.winner ?? null,
          }),
        },
        { status: 409 },
      );
    }

    const expectedToken =
      typedGame.current_turn === BLACK
        ? typedGame.black_player
        : typedGame.white_player;

    if (expectedToken !== playerToken) {
      return NextResponse.json(
        { ok: false, error: "Not your turn" },
        { status: 403 },
      );
    }

    if (typedGame.status !== "playing") {
      return NextResponse.json(
        { ok: false, error: "Game not in progress" },
        { status: 409 },
      );
    }

    if (getCell(typedGame.board, x, y) !== EMPTY) {
      return NextResponse.json(
        { ok: false, error: "Cell occupied" },
        { status: 409 },
      );
    }

    const newBoard = setCell(typedGame.board, x, y, typedGame.current_turn);
    const isWin = checkWin(newBoard, x, y, typedGame.current_turn);
    const isDraw = !isWin && newBoard.indexOf(EMPTY) === -1;

    const nextTurn: Player = typedGame.current_turn === BLACK ? WHITE : BLACK;
    const now = new Date().toISOString();

    const update: Partial<GomokuGameRow> = {
      board: newBoard,
      current_turn: nextTurn,
      move_count: typedGame.move_count + 1,
      version: typedGame.version + 1,
      last_move_at: now,
      updated_at: now,
    };

    if (isWin) {
      update.status = "finished";
      update.winner = typedGame.current_turn;
    } else if (isDraw) {
      update.status = "finished";
      update.winner = "draw";
    }

    const { data: updatedGame, error: updateError } = await supabase
      .from("gomoku_games")
      .update(update)
      .eq("id", typedGame.id)
      .select()
      .single();

    if (updateError || !updatedGame) {
      return NextResponse.json(
        { ok: false, error: "Failed to update game" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      game: formatGameForClient(updatedGame as GomokuGameRow),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
