import { createClient } from "@/lib/supabase/client";
import type { MemoEvent } from "@/components/todoList/MemoEventCard";

/* ------------------------------------------------------------------ */
/*  Database row type                                                  */
/* ------------------------------------------------------------------ */

export type TodoRow = {
  id: string;
  user_id: string;
  content: string;
  status: "todo" | "done";
  created_at: number;
  completed_at: number | null;
  updated_at: number;
  deleted_at: number | null;
};

/* ------------------------------------------------------------------ */
/*  Converters                                                         */
/* ------------------------------------------------------------------ */

export function toDbRow(event: MemoEvent, userId: string): TodoRow {
  return {
    id: event.id,
    user_id: userId,
    content: event.content,
    status: event.status,
    created_at: event.createdAt,
    completed_at: event.completedAt ?? null,
    updated_at: event.updatedAt,
    deleted_at: event.deletedAt ?? null,
  };
}

export function fromDbRow(row: TodoRow): MemoEvent {
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Merge local + cloud events                                         */
/* ------------------------------------------------------------------ */

export type MergeResult = {
  merged: MemoEvent[];
  cloudWins: MemoEvent[];
};

/**
 * Merge local and cloud events. For each event id, the version with the
 * larger `updatedAt` wins. Deleted events are kept in the result but can be
 * filtered by the caller via `deletedAt`.
 *
 * @returns merged list + list of events where cloud version won over local
 */
export function mergeEvents(
  local: MemoEvent[],
  cloud: MemoEvent[]
): MergeResult {
  const map = new Map<string, MemoEvent>();
  const cloudWins: MemoEvent[] = [];

  for (const item of local) {
    map.set(item.id, item);
  }

  for (const item of cloud) {
    const localItem = map.get(item.id);
    if (!localItem) {
      // Cloud has an item that local does not have.
      map.set(item.id, item);
    } else if (item.updatedAt > localItem.updatedAt) {
      // Cloud version is newer.
      map.set(item.id, item);
      cloudWins.push(item);
    }
    // Otherwise local is newer or equal — keep local.
  }

  return {
    merged: Array.from(map.values()),
    cloudWins,
  };
}

/* ------------------------------------------------------------------ */
/*  Cloud operations                                                   */
/* ------------------------------------------------------------------ */

export type PullResult =
  | { ok: true; events: MemoEvent[] }
  | { ok: false; error: string };

/**
 * Pull all active (non-deleted) todos from Supabase for the current user.
 */
export async function pullFromCloud(): Promise<PullResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: authError?.message ?? "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("todos")
    .select("id, user_id, content, status, created_at, completed_at, updated_at, deleted_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, events: (data ?? []).map(fromDbRow) };
}

export type PushResult =
  | { ok: true; cloudWins: MemoEvent[] }
  | { ok: false; error: string };

/**
 * Push local events to the cloud using timestamp-based conflict resolution.
 *
 * Strategy:
 * 1. Fetch current cloud state.
 * 2. For each local event, compare timestamps with the cloud version.
 *    - Local newer: upsert to cloud.
 *    - Cloud newer: update local state (returned in cloudWins).
 *    - Only in cloud: keep it.
 * 3. Soft-deleted local events are also upserted with deleted_at set so the
 *    cloud knows they are deleted.
 */
export async function pushToCloud(events: MemoEvent[]): Promise<PushResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: authError?.message ?? "Not authenticated" };
  }

  // Fetch current cloud state to perform timestamp comparison.
  const { data: cloudRows, error: fetchError } = await supabase
    .from("todos")
    .select("id, user_id, content, status, created_at, completed_at, updated_at, deleted_at")
    .eq("user_id", user.id);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const cloudMap = new Map<string, TodoRow>();
  for (const row of cloudRows ?? []) {
    cloudMap.set(row.id, row);
  }

  const toUpsert: TodoRow[] = [];
  const cloudWins: MemoEvent[] = [];

  for (const local of events) {
    const cloud = cloudMap.get(local.id);

    if (!cloud) {
      // New local event — insert to cloud.
      toUpsert.push(toDbRow(local, user.id));
    } else if (local.updatedAt > cloud.updated_at) {
      // Local is newer — update cloud.
      toUpsert.push(toDbRow(local, user.id));
    } else if (cloud.updated_at > local.updatedAt) {
      // Cloud is newer — update local state later.
      cloudWins.push(fromDbRow(cloud));
    }
    // If timestamps are equal, do nothing.
  }

  if (toUpsert.length > 0) {
    const { error: upsertError } = await supabase.from("todos").upsert(toUpsert, {
      onConflict: "id",
    });

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }
  }

  return { ok: true, cloudWins };
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

/**
 * Physically delete a todo row from Supabase for the current user.
 */
export async function deleteTodoFromCloud(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: authError?.message ?? "Not authenticated" };
  }

  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  One-shot full sync: pull + merge + push                            */
/* ------------------------------------------------------------------ */

export type FullSyncResult =
  | {
      ok: true;
      merged: MemoEvent[];
      cloudWins: MemoEvent[];
    }
  | { ok: false; error: string };

/**
 * Perform a full bidirectional sync:
 * 1. Pull cloud events.
 * 2. Merge with local events (last write wins).
 * 3. Push merged result back to cloud.
 *
 * Returns the merged list that should become the new local state.
 */
export async function fullSync(local: MemoEvent[]): Promise<FullSyncResult> {
  const pullResult = await pullFromCloud();
  if (!pullResult.ok) return pullResult;

  const { merged, cloudWins: mergeWins } = mergeEvents(
    local,
    pullResult.events
  );

  const pushResult = await pushToCloud(merged);
  if (!pushResult.ok) return pushResult;

  // Combine cloud wins from merge and from push.
  const allCloudWins = [...mergeWins, ...pushResult.cloudWins];

  // Deduplicate by id, keeping the latest updatedAt.
  const winMap = new Map<string, MemoEvent>();
  for (const item of allCloudWins) {
    const existing = winMap.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      winMap.set(item.id, item);
    }
  }

  return {
    ok: true,
    merged,
    cloudWins: Array.from(winMap.values()),
  };
}
