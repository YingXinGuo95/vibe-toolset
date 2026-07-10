"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MemoEvent,
  MemoStatus,
  fmtFullDate,
} from "@/components/todoList/MemoEventCard";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDateCompact(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekRange(range: WeekRange): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diff);
  thisMonday.setHours(0, 0, 0, 0);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  if (range === "thisWeek") {
    return { start: thisMonday, end: thisSunday };
  }
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);
  return { start: lastMonday, end: lastSunday };
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type WeekRange = "thisWeek" | "lastWeek";
type ReportLength = "detailed" | "concise" | "minimal";
type ReportFormat = "text" | "markdown";

interface WeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thisWeekEvents: MemoEvent[];
  lastWeekEvents: MemoEvent[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WeeklyReportDialog({
  open,
  onOpenChange,
  thisWeekEvents,
  lastWeekEvents,
  t,
}: WeeklyReportDialogProps) {
  const [weekRange, setWeekRange] = useState<WeekRange>("thisWeek");

  const displayEvents = weekRange === "thisWeek" ? thisWeekEvents : lastWeekEvents;

  const [reportStatusFilter, setReportStatusFilter] = useState<
    Record<MemoStatus, boolean>
  >({
    todo: true,
    done: true,
  });

  /* report options */
  const [reportLength, setReportLength] = useState<ReportLength>("concise");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("text");

  /* item selection — which items will be included in the report */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* reset selection when dialog opens */
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      // dialog just opened — pre-select all filtered items
      const ids = displayEvents
        .filter((ev) => reportStatusFilter[ev.status])
        .map((ev) => ev.id);
      setSelectedIds(new Set(ids));
    }
    prevOpen.current = open;
  }, [open, displayEvents, reportStatusFilter]);

  const filteredItems = useMemo(
    () =>
      displayEvents
        .filter((ev) => reportStatusFilter[ev.status])
        .sort((a, b) => b.createdAt - a.createdAt),
    [displayEvents, reportStatusFilter],
  );

  const toggleStatus = (s: MemoStatus, checked: boolean) =>
    setReportStatusFilter((prev) => ({ ...prev, [s]: checked }));

  const toggleItem = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });

  /* ---- report generation state ---- */
  const [generating, setGenerating] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const reportEndRef = useRef<HTMLDivElement>(null);

  /* auto-scroll report output */
  useEffect(() => {
    reportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reportContent]);

  const handleGenerate = useCallback(async () => {
    const selectedEvents = displayEvents
      .filter((ev) => selectedIds.has(ev.id))
      .map((ev) => ({ content: ev.content, status: ev.status, createdAt: ev.createdAt }));

    if (selectedEvents.length === 0) return;

    setGenerating(true);
    setReportContent("");
    setReportError(null);

    try {
      const res = await fetch("/api/chat/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: selectedEvents,
          length: reportLength,
          format: reportFormat,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              setReportContent((prev) => prev + delta);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }, [displayEvents, selectedIds, weekRange, reportLength, reportFormat]);

  /* ---- pill button for option groups ---- */
  const Pill = <T extends string>({
    value,
    current,
    onChange,
    label,
  }: {
    value: T;
    current: T;
    onChange: (v: T) => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        value === current
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Block closing while generating to avoid losing the report
        if (generating && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-w-3xl flex flex-col"
        showCloseButton={!generating}
        style={{ height: "70vh" }}
      >
        <DialogHeader>
          <DialogTitle>{t("weeklyReportTitle")}</DialogTitle>
        </DialogHeader>

        {/* Week range selector */}
        <div className="flex items-center gap-4 text-sm">
          {(["thisWeek", "lastWeek"] as WeekRange[]).map((r) => (
            <label
              key={r}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="radio"
                name="weekRange"
                checked={weekRange === r}
                onChange={() => setWeekRange(r)}
                className="size-3.5 border-input accent-primary"
              />
              <span>{t(r === "thisWeek" ? "thisWeek" : "lastWeek")}</span>
            </label>
          ))}
          <span className="text-xs text-muted-foreground font-mono">
            {(() => {
              const { start, end } = getWeekRange(weekRange);
              return `${fmtDateCompact(start)} ~ ${fmtDateCompact(end)}`;
            })()}
          </span>
        </div>

        {/* Status filter checkboxes */}
        <div className="flex items-center gap-4 text-sm">
          {/* Report length & format options */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("lengthLabel")}</span>
              {(["detailed", "concise", "minimal"] as ReportLength[]).map((l) => (
                <Pill key={l} value={l} current={reportLength} onChange={setReportLength} label={t(`length.${l}`)} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("formatLabel")}</span>
              {(["text", "markdown"] as ReportFormat[]).map((f) => (
                <Pill key={f} value={f} current={reportFormat} onChange={setReportFormat} label={t(`format.${f}`)} />
              ))}
            </div>
          </div>
        </div>

        {/* Status filter checkboxes */}
        <div className="flex items-center gap-4 text-sm">
          {(["todo", "done"] as MemoStatus[]).map((s) => (
            <label
              key={s}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={reportStatusFilter[s]}
                onChange={(e) => toggleStatus(s as MemoStatus, e.target.checked)}
                className="size-3.5 rounded border-input accent-primary"
              />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s === "todo"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                }`}
              >
                {t(
                  `status${s.charAt(0).toUpperCase() + s.slice(1)}` as
                    | "statusTodo"
                    | "statusDone",
                )}
              </span>
            </label>
          ))}
        </div>

        {/* Items list — scrollable, hidden when report is showing */}
        {!reportContent && !generating ? (
          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              filteredItems.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  {/* Item checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ev.id)}
                    onChange={(e) => toggleItem(ev.id, e.target.checked)}
                    className="mt-0.5 size-3.5 shrink-0 rounded border-input accent-primary cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">
                      {ev.content}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {fmtFullDate(ev.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ev.status === "todo"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {t(
                      `status${ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}` as
                        | "statusTodo"
                        | "statusDone",
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ---- Report output area ---- */
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 pr-1">
            {generating && !reportContent && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                {t("generatingReport")}
              </div>
            )}
            {reportContent && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed">
                {reportContent}
              </div>
            )}
            {reportError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {t("reportError")}: {reportError}
              </div>
            )}
            <div ref={reportEndRef} />
          </div>
        )}

        <DialogFooter className="gap-2">
          {reportContent || generating ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setReportContent("");
                  setReportError(null);
                }}
                disabled={generating}
              >
                {t("backToSelect")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(reportContent);
                }}
                disabled={generating || !reportContent}
              >
                {t("copyReport")}
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? t("generatingReport") : t("regenerate")}
              </Button>
              <Button onClick={() => onOpenChange(false)} disabled={generating}>
                {t("cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedIds.size === 0 || generating}
              >
                {generating ? t("generatingReport") : t("generate")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
