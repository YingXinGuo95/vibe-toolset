"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Undo2,
  Pencil,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type MemoStatus = "todo" | "done";

export interface MemoEvent {
  id: string;
  content: string;
  status: MemoStatus;
  createdAt: number;
  completedAt?: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface EventCardProps {
  event: MemoEvent;
  isEditing: boolean;
  editValue: string;
  onToggleDone: (id: string) => void;
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
  onDelete,
  onStartEdit,
  onSaveEdit,
  onEditKeyDown,
  onEditChange,
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
  } else {
    statusBadge = (
      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t("statusDone")}
      </span>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/30">
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
            className="cursor-text text-sm leading-snug transition-colors"
            title={t("edit")}
          >
            {content}
          </p>
        )}
        {/* Time + inline actions */}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{fmtFullDate(createdAt)}</span>
          {status === "done" && completedAt && (
            <span className="text-green-600 dark:text-green-400">
              {t("completedAt", { time: fmtFullDate(completedAt) })}
            </span>
          )}
          <span className="text-muted-foreground/40">·</span>
          {status === "todo" && (
            <button
              onClick={() => onStartEdit(event)}
              title={t("edit")}
              className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
            >
              <Pencil className="size-3" />
              <span>{t("edit")}</span>
            </button>
          )}
          <button
            onClick={() => onDelete(event)}
            title={t("delete")}
            className="inline-flex items-center gap-0.5 hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3" />
            <span>{t("delete")}</span>
          </button>
        </div>
      </div>

      {/* Action + badge */}
      <div className="flex shrink-0 items-center gap-1.5">
        {status === "todo" && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onToggleDone(event.id)}
            title={t("markDone")}
            className="size-7 shrink-0 text-muted-foreground hover:text-green-600 hover:border-green-400"
          >
            <Check className="size-3.5" />
          </Button>
        )}
        {status === "done" && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onToggleDone(event.id)}
            title={t("markTodo")}
            className="size-7 shrink-0"
          >
            <Undo2 className="size-3.5" />
          </Button>
        )}
        {statusBadge}
      </div>
    </div>
  );
}
