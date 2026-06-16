"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Undo2,
  RotateCcw,
  Pencil,
  Ban,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type MemoStatus = "todo" | "done" | "abandoned";

export interface MemoEvent {
  id: string;
  content: string;
  status: MemoStatus;
  createdAt: number;
  completedAt?: number;
  updatedAt: number;
}

export interface EventCardProps {
  event: MemoEvent;
  isEditing: boolean;
  editValue: string;
  showFullDate?: boolean;
  onToggleDone: (id: string) => void;
  onAbandon: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (ev: MemoEvent) => void;
  onStartEdit: (ev: MemoEvent) => void;
  onSaveEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onEditChange: (v: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtHHMM(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtFullDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MemoEventCard({
  event,
  isEditing,
  editValue,
  onToggleDone,
  onAbandon,
  onRestore,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onEditKeyDown,
  onEditChange,
  showFullDate = false,
  t,
}: EventCardProps) {
  const { content, status, createdAt, completedAt } = event;

  let statusBadge: React.ReactNode;
  if (status === "todo") {
    statusBadge = (
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {t("statusTodo")}
      </span>
    );
  } else if (status === "done") {
    statusBadge = (
      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t("statusDone")}
      </span>
    );
  } else {
    statusBadge = (
      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {t("statusAbandoned")}
      </span>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30">
      {/* Content */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            onBlur={onSaveEdit}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <p
            onDoubleClick={() => onStartEdit(event)}
            className={`cursor-text text-sm leading-snug transition-colors ${
              status === "done"
                ? "line-through text-muted-foreground"
                : status === "abandoned"
                  ? "line-through text-muted-foreground/60"
                  : ""
            }`}
            title={t("edit")}
          >
            {content}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{showFullDate ? fmtFullDate(createdAt) : fmtHHMM(createdAt)}</span>
          {status === "done" && completedAt && (
            <span className="text-green-600 dark:text-green-400">
              {t("completedAt", { time: fmtHHMM(completedAt) })}
            </span>
          )}
        </div>
      </div>

      {/* Badge + actions */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {/* Top row: primary action + status badge */}
        <div className="flex items-center gap-1.5">
          {status === "todo" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onToggleDone(event.id)}
              title={t("markDone")}
              className="shrink-0 text-muted-foreground hover:text-green-600 hover:border-green-400"
            >
              <Check className="size-4" />
            </Button>
          )}
          {status === "done" && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onToggleDone(event.id)}
              title={t("markTodo")}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          )}
          {status === "abandoned" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onRestore(event.id)}
              title={t("restore")}
              className="shrink-0 text-muted-foreground hover:text-green-600 hover:border-green-400"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          {statusBadge}
        </div>

        {/* Bottom row: secondary action icons */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {status === "todo" && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onStartEdit(event)}
                title={t("edit")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onAbandon(event.id)}
                title={t("abandon")}
                className="text-muted-foreground hover:text-orange-500"
              >
                <Ban className="size-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(event)}
            title={t("delete")}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
