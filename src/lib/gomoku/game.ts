export const BOARD_SIZE = 15;
export const EMPTY = " ";
export const BLACK = "B";
export const WHITE = "W";

export type Player = typeof BLACK | typeof WHITE;
export type GameStatus = "waiting" | "playing" | "finished";

export const MOVE_TIMEOUT_MS = 60_000;
export const WAIT_TIMEOUT_MS = 8_000;

export interface GomokuGameRow {
  id: string;
  short_code: string;
  status: GameStatus;
  black_player: string | null;
  white_player: string | null;
  current_turn: Player;
  winner: Player | "draw" | null;
  board: string;
  move_count: number;
  version: number;
  last_move_at: string;
  created_at: string;
  updated_at: string;
}

export function createEmptyBoard(): string {
  return EMPTY.repeat(BOARD_SIZE * BOARD_SIZE);
}

export function getCell(
  board: string,
  x: number,
  y: number,
): Player | typeof EMPTY {
  return board[y * BOARD_SIZE + x] as Player | typeof EMPTY;
}

export function setCell(
  board: string,
  x: number,
  y: number,
  player: Player,
): string {
  const idx = y * BOARD_SIZE + x;
  return board.slice(0, idx) + player + board.slice(idx + 1);
}

export function checkWin(
  board: string,
  x: number,
  y: number,
  player: Player,
): boolean {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    for (const dir of [-1, 1]) {
      let nx = x + dx * dir;
      let ny = y + dy * dir;

      while (
        nx >= 0 &&
        nx < BOARD_SIZE &&
        ny >= 0 &&
        ny < BOARD_SIZE &&
        getCell(board, nx, ny) === player
      ) {
        count++;
        nx += dx * dir;
        ny += dy * dir;
      }
    }

    if (count >= 5) return true;
  }

  return false;
}

export function checkTimeout(game: GomokuGameRow): {
  timedOut: boolean;
  winner?: Player;
} {
  if (game.status !== "playing") return { timedOut: false };

  const elapsed =
    Date.now() - new Date(game.last_move_at || game.created_at).getTime();

  if (elapsed > MOVE_TIMEOUT_MS) {
    return {
      timedOut: true,
      winner: game.current_turn === BLACK ? WHITE : BLACK,
    };
  }

  return { timedOut: false };
}

export function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function toCellLabel(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

export function formatGameForClient(game: GomokuGameRow) {
  return {
    id: game.id,
    shortCode: game.short_code,
    status: game.status,
    blackPlayer: game.black_player,
    whitePlayer: game.white_player,
    currentTurn: game.current_turn,
    winner: game.winner,
    board: game.board,
    moveCount: game.move_count,
    version: game.version,
    lastMoveAt: game.last_move_at,
    updatedAt: game.updated_at,
  };
}
