"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  WHITE,
} from "@/lib/gomoku/game";
import { toCellLabel } from "@/lib/gomoku/game";

type Player = typeof BLACK | typeof WHITE;

interface GameState {
  id: string;
  shortCode: string;
  status: "waiting" | "playing" | "finished";
  blackPlayer?: string;
  whitePlayer?: string;
  currentTurn: Player;
  winner?: Player | "draw" | null;
  board: string;
  moveCount: number;
  version: number;
  lastMoveAt: string;
  updatedAt: string;
}

const PLAYER_TOKEN_KEY = "gomoku_player_token";
const MOVE_TIMEOUT_SECONDS = 60;

function getPlayerToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(PLAYER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(PLAYER_TOKEN_KEY, token);
  }
  return token;
}

function getCell(board: string, x: number, y: number): Player | typeof EMPTY {
  return board[y * BOARD_SIZE + x] as Player | typeof EMPTY;
}

export default function GomokuPage() {
  const t = useTranslations("Gomoku");
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room");

  const [game, setGame] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<"black" | "white" | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [remaining, setRemaining] = useState(60);
  const [ongoingRoom, setOngoingRoom] = useState<{ shortCode: string; url: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playerToken = typeof window !== "undefined" ? getPlayerToken() : "";

  const makeOngoingRoomUrl = useCallback(
    (shortCode: string) =>
      `${window.location.origin}${window.location.pathname}?room=${shortCode}`,
    [],
  );

  const fetchState = useCallback(
    async (shortCode: string) => {
      const res = await fetch(
        `/api/gomoku/rooms/${shortCode}?playerToken=${playerToken}`,
      );
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "ONGOING_GAME" && data.shortCode) {
          setOngoingRoom({
            shortCode: data.shortCode,
            url: makeOngoingRoomUrl(data.shortCode),
          });
        }
        throw new Error(data.error);
      }
      return data as {
        game: GameState;
        player: "black" | "white" | null;
        isFull: boolean;
      };
    },
    [playerToken, makeOngoingRoomUrl],
  );

  const longPoll = useCallback(
    async (shortCode: string, lastVersion: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await fetch(
          `/api/gomoku/rooms/${shortCode}/wait?lastVersion=${lastVersion}`,
          { signal: abortRef.current.signal },
        );

        if (!res.ok) return;

        const data = await res.json();
        const nextVersion = data.game?.version ?? lastVersion;
        const changed = !!data.game;

        // eslint-disable-next-line no-console
        console.log("[longPoll]", { shortCode, lastVersion, changed, nextVersion });

        if (changed) {
          setGame(data.game);
        }

        // State changed → quick retry to catch next update.
        // No change / timeout → shorter backoff to recover quickly.
        const delay = changed
          ? 500 + Math.floor(Math.random() * 1000)
          : 1000 + Math.floor(Math.random() * 1000);

        timeoutRef.current = setTimeout(() => {
          if (roomParam) longPoll(roomParam, nextVersion);
        }, delay);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log("[longPoll] error", err);
        const delay = 1000 + Math.floor(Math.random() * 1000);
        timeoutRef.current = setTimeout(() => {
          if (roomParam) longPoll(roomParam, lastVersion);
        }, delay);
      }
    },
    [roomParam],
  );

  useEffect(() => {
    if (!roomParam) return;

    setLoading(true);
    fetchState(roomParam)
      .then((data) => {
        setGame(data.game);
        setPlayer(data.player);
        setIsFull(data.isFull);
        setLoading(false);
        longPoll(roomParam, data.game.version);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    return () => {
      abortRef.current?.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [roomParam, fetchState, longPoll]);

  useEffect(() => {
    if (!game || game.status !== "playing") return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - new Date(game.lastMoveAt).getTime();
      const left = Math.max(0, MOVE_TIMEOUT_SECONDS - Math.floor(elapsed / 1000));
      setRemaining(left);
    }, 1000);

    return () => clearInterval(timer);
  }, [game]);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gomoku/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerToken }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "ONGOING_GAME" && data.shortCode) {
          setOngoingRoom({
            shortCode: data.shortCode,
            url: makeOngoingRoomUrl(data.shortCode),
          });
        }
        throw new Error(data.error);
      }
      router.push(`?room=${data.shortCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const makeMove = async (x: number, y: number) => {
    if (!game || !roomParam || !player || game.status !== "playing") return;
    if (game.currentTurn !== (player === "black" ? BLACK : WHITE)) return;
    if (getCell(game.board, x, y) !== EMPTY) return;

    try {
      const res = await fetch(`/api/gomoku/rooms/${roomParam}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerToken, x, y }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }

      setGame(data.game);
      setSelectedCell({ x, y });
      longPoll(roomParam, data.game.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    }
  };

  const shareUrl =
    typeof window !== "undefined" && game
      ? `${window.location.origin}${window.location.pathname}?room=${game.shortCode}`
      : "";

  const copyLink = () => {
    if (shareUrl) navigator.clipboard.writeText(shareUrl);
  };

  if (ongoingRoom) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <h1 className="text-xl font-bold">{t("ongoingGameTitle")}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t("ongoingGameDescription")}
            </p>
            <Input value={ongoingRoom.url} readOnly className="h-8 text-xs" />
            <Button
              onClick={() => router.push(ongoingRoom.url)}
              className="w-full"
            >
              {t("backToOngoingGame")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roomParam) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="rounded-lg bg-green-600 p-4 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t("description")}
            </p>
            <Button onClick={createRoom} disabled={loading} className="w-full">
              {loading ? t("creating") : t("createRoom")}
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        {t("loading")}
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-lg font-semibold">{t("roomFull")}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>{error || t("notFound")}</p>
      </div>
    );
  }

  const isMyTurn =
    game.status === "playing" &&
    game.currentTurn === (player === "black" ? BLACK : WHITE);

  const statusText =
    game.status === "waiting"
      ? t("waitingForOpponent")
      : game.status === "finished"
        ? game.winner === "draw"
          ? t("draw")
          : game.winner === (player === "black" ? BLACK : WHITE)
            ? t("youWin")
            : t("youLose")
        : isMyTurn
          ? t("yourTurn")
          : t("opponentTurn");

  if (game.status === "finished") {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <h1 className="text-2xl font-bold">{t("gameOver")}</h1>
            <p className="text-center text-muted-foreground">{statusText}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col px-2 py-4">
      {/* Fake Excel Ribbon */}
      <div className="mb-2 rounded-t border border-b-0 border-gray-300 bg-green-700 text-white">
        <div className="flex items-center gap-4 px-3 py-1 text-xs">
          <span className="font-bold">File</span>
          <span>Home</span>
          <span>Insert</span>
          <span>Formulas</span>
          <span>Data</span>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="mb-2 flex items-center gap-2 border border-gray-300 bg-gray-100 px-2 py-1 text-sm">
        <span className="w-16 text-gray-500">Name Box</span>
        <span className="rounded border bg-white px-2 py-0.5 text-xs">
          {selectedCell ? toCellLabel(selectedCell.x, selectedCell.y) : "A1"}
        </span>
        <span className="w-10 text-gray-500">fx</span>
        <span className="flex-1 rounded border bg-white px-2 py-0.5 text-xs">
          {selectedCell
            ? `=MOVE("${toCellLabel(selectedCell.x, selectedCell.y)}", "${game.currentTurn === BLACK ? "BLACK" : "WHITE"}")`
            : ""}
        </span>
      </div>

      {/* Status / Share */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-medium">{statusText}</span>
          {game.status === "playing" && (
            <span className="text-xs text-muted-foreground">
              {t("timeoutIn", { seconds: remaining })}
            </span>
          )}
        </div>
        {game.status === "waiting" && player === "black" && (
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="h-8 w-56 text-xs" />
            <Button size="sm" onClick={copyLink}>
              {t("copyLink")}
            </Button>
          </div>
        )}
      </div>

      {/* Spreadsheet Board */}
      <div className="flex-1 overflow-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `2rem repeat(${BOARD_SIZE}, 2rem)`,
          }}
        >
          {/* Corner */}
          <div className="border border-gray-300 bg-gray-100" />

          {/* Column headers */}
          {Array.from({ length: BOARD_SIZE }).map((_, x) => (
            <div
              key={`col-${x}`}
              className="flex items-center justify-center border border-gray-300 bg-gray-100 text-xs font-medium text-gray-600"
            >
              {String.fromCharCode(65 + x)}
            </div>
          ))}

          {Array.from({ length: BOARD_SIZE }).map((_, y) => (
            <div key={`row-${y}`} className="contents">
              <div className="flex items-center justify-center border border-gray-300 bg-gray-100 text-xs font-medium text-gray-600">
                {y + 1}
              </div>
              {Array.from({ length: BOARD_SIZE }).map((_, x) => {
                const cell = getCell(game.board, x, y);
                const isSelected =
                  selectedCell?.x === x && selectedCell?.y === y;

                return (
                  <button
                    key={`cell-${x}-${y}`}
                    onClick={() => {
                      setSelectedCell({ x, y });
                      void makeMove(x, y);
                    }}
                    className={`relative flex h-8 w-8 items-center justify-center border border-gray-300 text-xs transition-colors hover:bg-blue-50 focus:outline-none ${
                      isSelected ? "ring-2 ring-green-500 ring-inset" : ""
                    }`}
                  >
                    {cell === BLACK && (
                      <>
                        <span className="absolute inset-0 bg-slate-300" />
                        <span className="relative text-[10px] font-bold text-slate-600">
                          ·
                        </span>
                      </>
                    )}
                    {cell === WHITE && (
                      <>
                        <span className="absolute inset-0 border border-slate-200 bg-slate-50" />
                        <span className="relative text-[10px] font-bold text-slate-400">
                          ∘
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Fake status bar */}
      <div className="mt-2 flex justify-between border border-gray-300 bg-green-700 px-3 py-1 text-xs text-white">
        <span>Ready</span>
        <span>Move {game.moveCount}</span>
      </div>

      {error && (
        <p className="mt-2 text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
