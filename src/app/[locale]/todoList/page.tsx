"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { WeeklyReportDialog } from "@/components/todoList/WeeklyReportDialog";
import {
  Plus,
  Undo2,
  ChevronDown,
  Calendar,
  FileText,
  Forward,
} from "lucide-react";
import {
  MemoEventCard,
  MemoEvent,
  MemoStatus,
} from "@/components/todoList/MemoEventCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DateFilter = "all" | "today" | "week" | "7days" | "30days" | "month" | "custom";

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "vibe-memo-events";

function loadEvents(): MemoEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: MemoEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // quota exceeded — silently ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function toDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDateLabel(dateKey: string, locale: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const zhWeek = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const enWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = locale === "zh" ? zhWeek[date.getDay()] : enWeek[date.getDay()];
  if (locale === "zh") return `${m}月${d}日 ${weekday}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${weekday}`;
}


function isTodayKey(key: string): boolean {
  return key === toDateKey(Date.now());
}

function withinDays(key: string, days: number): boolean {
  const target = new Date(key + "T00:00:00");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  return target >= cutoff;
}

function isThisWeek(key: string): boolean {
  const now = new Date();
  const target = new Date(key + "T00:00:00");
  // Get Monday of current week
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  // Sunday is Monday + 6
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return target >= monday && target <= sunday;
}

function isLastWeek(key: string): boolean {
  const now = new Date();
  const target = new Date(key + "T00:00:00");
  // Get Monday of current week
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diff);
  thisMonday.setHours(0, 0, 0, 0);
  // Last week is thisMonday - 7 to thisMonday - 1
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);
  return target >= lastMonday && target <= lastSunday;
}

function isThisMonth(key: string): boolean {
  const now = new Date();
  const [y, m] = key.split("-").map(Number);
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

function isWithinRange(key: string, start: string, end: string): boolean {
  const target = key + "T00:00:00";
  return target >= start + "T00:00:00" && target <= end + "T23:59:59";
}

function toInputDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function TodoListPage() {
  const t = useTranslations("TodoList");
  const locale = useLocale();

  /* ---- state ---- */
  const [events, setEvents] = useState<MemoEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [inputValue, setInputValue] = useState("");
  /* date selector for new memo — "today" or "custom" */
  type CreateDateMode = "today" | "custom";
  const [createDateMode, setCreateDateMode] = useState<CreateDateMode>("today");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pendingStart, setPendingStart] = useState("");
  const [pendingEnd, setPendingEnd] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [undoItem, setUndoItem] = useState<MemoEvent | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- hydration ---- */
  useEffect(() => {
    setEvents(loadEvents());
    setHydrated(true);
  }, []);

  /* ---- persist ---- */
  useEffect(() => {
    if (hydrated) saveEvents(events);
  }, [events, hydrated]);

  /* ---- auto-expand today ---- */
  useEffect(() => {
    if (!hydrated) return;
    const todayKey = toDateKey(Date.now());
    setOpenGroups((prev) => (prev[todayKey] === undefined ? { ...prev, [todayKey]: true } : prev));
  }, [hydrated]);

  /* ---- actions ---- */
  const handleAdd = useCallback(() => {
    const content = inputValue.trim();
    if (!content) return;
    const updatedTs = Date.now();
    const createdTs =
      createDateMode === "custom"
        ? new Date(new Date().getFullYear(), selectedMonth - 1, selectedDay, new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()).getTime()
        : updatedTs;
    setEvents((prev) => [
      { id: crypto.randomUUID(), content, status: "todo", createdAt: createdTs, updatedAt: updatedTs },
      ...prev,
    ]);
    setInputValue("");
    /* reset date selector to today */
    setCreateDateMode("today");
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
  }, [inputValue, createDateMode, selectedMonth, selectedDay]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleToggleDone = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== id) return ev;
        const now = Date.now();
        return ev.status === "done"
          ? { ...ev, status: "todo" as MemoStatus, completedAt: undefined, updatedAt: now }
          : { ...ev, status: "done" as MemoStatus, completedAt: now, updatedAt: now };
      }),
    );
  }, []);

  const handleAbandon = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, status: "abandoned" as MemoStatus, updatedAt: Date.now() } : ev)),
    );
  }, []);

  const handleRestore = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, status: "todo" as MemoStatus, updatedAt: Date.now() } : ev)),
    );
  }, []);

  const handleDelete = useCallback((ev: MemoEvent) => {
    setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    setUndoItem(ev);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 5000);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    setEvents((prev) => [undoItem, ...prev]);
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [undoItem]);

  /* ---- inline edit ---- */
  const handleStartEdit = useCallback((ev: MemoEvent) => {
    setEditingId(ev.id);
    setEditValue(ev.content);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      setEvents((prev) =>
        prev.map((ev) => (ev.id === editingId ? { ...ev, content: trimmed, updatedAt: Date.now() } : ev)),
      );
    }
    setEditingId(null);
    setEditValue("");
  }, [editingId, editValue]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === "Escape") {
        setEditingId(null);
        setEditValue("");
      }
    },
    [handleSaveEdit],
  );

  const handleEditChange = useCallback((v: string) => setEditValue(v), []);

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ---- computed ---- */
  const filteredEvents = useMemo(() => {
    if (dateFilter === "all") return events;
    return events.filter((ev) => {
      const dk = toDateKey(ev.createdAt);
      switch (dateFilter) {
        case "today":
          return isTodayKey(dk);
        case "week":
          return isThisWeek(dk);
        case "7days":
          return withinDays(dk, 7);
        case "30days":
          return withinDays(dk, 30);
        case "month":
          return isThisMonth(dk);
        case "custom":
          return customStart && customEnd ? isWithinRange(dk, customStart, customEnd) : true;
        default:
          return true;
      }
    });
  }, [events, dateFilter, customStart, customEnd]);

  const FUTURE_KEY = "__future__";

  const dayGroups = useMemo(() => {
    const groups: Record<string, MemoEvent[]> = {};
    const todayStr = toDateKey(Date.now());
    for (const ev of filteredEvents) {
      const dk = toDateKey(ev.createdAt);
      // Merge future dates into a single virtual group
      const key = dk > todayStr ? FUTURE_KEY : dk;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    // sort events within each group by createdAt desc
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a: MemoEvent, b: MemoEvent) => b.createdAt - a.createdAt);
    });
    // sort groups: __future__ first, then by date desc
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === FUTURE_KEY) return -1;
        if (b === FUTURE_KEY) return 1;
        return b.localeCompare(a);
      })
      .map(([date, items]) => ({ date, items }));
  }, [filteredEvents]);

  const thisWeekEvents = useMemo(
    () => events.filter((ev) => isThisWeek(toDateKey(ev.createdAt))),
    [events],
  );

  const lastWeekEvents = useMemo(
    () => events.filter((ev) => isLastWeek(toDateKey(ev.createdAt))),
    [events],
  );

  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const done = filteredEvents.filter((e) => e.status === "done").length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, rate };
  }, [filteredEvents]);

  /* ---- render ---- */
  if (!hydrated) return null;

  const todayKey = toDateKey(Date.now());

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8">
      {/* Main content — visually centered */}
      <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          {t("breadcrumbHome")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{t("title")}</span>
      </div>

      {/* Title + filter */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Calendar className="size-3.5" />
                {dateFilter === "custom" && customStart && customEnd
                  ? t("filter.customRange", { start: customStart, end: customEnd })
                  : t(`filter.${dateFilter}`)}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(["all", "today", "week", "7days", "30days", "month", "custom"] as DateFilter[]).map((f) => (
                <DropdownMenuItem
                  key={f}
                  onClick={() => {
                    if (f !== "custom") {
                      setDateFilter(f);
                    } else {
                      setPendingStart(customStart || toInputDate(Date.now() - 6 * 86400000));
                      setPendingEnd(customEnd || toInputDate(Date.now()));
                      setDateFilter("custom");
                    }
                  }}
                >
                  {t(`filter.${f}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom date range picker */}
      {dateFilter === "custom" && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("filter.startDate")}
            </label>
            <Input
              type="date"
              value={pendingStart}
              onChange={(e) => setPendingStart(e.target.value)}
              className="h-8 w-40 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("filter.endDate")}
            </label>
            <Input
              type="date"
              value={pendingEnd}
              onChange={(e) => setPendingEnd(e.target.value)}
              className="h-8 w-40 text-sm"
            />
          </div>
          <Button
            size="sm"
            disabled={!pendingStart || !pendingEnd}
            onClick={() => {
              setCustomStart(pendingStart);
              setCustomEnd(pendingEnd);
            }}
          >
            {t("filter.apply")}
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="mb-6 space-y-2">
        {/* Date selector row */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Calendar className="size-3.5" />
                {createDateMode === "custom" ? t("createCustom") : t("createToday")}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCreateDateMode("today")}>
                {t("createToday")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!selectedMonth) {
                    const d = new Date();
                    setSelectedMonth(d.getMonth() + 1);
                    setSelectedDay(d.getDate());
                  }
                  setCreateDateMode("custom");
                }}
              >
                {t("createCustom")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Custom date picker — inline, right of dropdown */}
          {createDateMode === "custom" && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  const maxDay = new Date(new Date().getFullYear(), m, 0).getDate();
                  if (selectedDay > maxDay) setSelectedDay(maxDay);
                }}
                className="h-7 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:border-ring"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}{t("month")}</option>
                ))}
              </select>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="h-7 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:border-ring"
              >
                {Array.from({ length: new Date(new Date().getFullYear(), selectedMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}{t("day")}</option>
                ))}
              </select>
            </>
          )}
        </div>
        {/* Textarea + add button */}
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            className="min-h-20 resize-none"
            rows={2}
          />
          <Button onClick={handleAdd} disabled={!inputValue.trim()} className="shrink-0 self-end">
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      </div>

      {/* Undo toast */}
      {undoItem && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2 text-sm">
          <span className="text-muted-foreground">{t("deleted")}</span>
          <Button variant="outline" size="xs" onClick={handleUndo}>
            <Undo2 className="size-3" />
            {t("undo")}
          </Button>
        </div>
      )}

      {/* Statistics */}
      {filteredEvents.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{t("statsTotal", { count: stats.total })}</span>
          <span>{t("statsDone", { count: stats.done })}</span>
          <span>{t("statsRate", { rate: stats.rate })}</span>
        </div>
      )}

      {/* Day groups */}
      {dayGroups.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar className="mx-auto mb-3 size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map(({ date, items }) => {
            const isFuture = date === FUTURE_KEY;
            const isToday = !isFuture && date === todayKey;
            const isOpen = openGroups[date] === true || (openGroups[date] === undefined && isToday);

            return (
              <Collapsible
                key={date}
                open={isOpen}
                onOpenChange={() => toggleGroup(date)}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-sm font-medium transition-colors hover:bg-muted/50 [&[data-panel-open]>svg]:rotate-0">
                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                  <span>{isFuture ? t("futureGroup") : fmtDateLabel(date, locale)}</span>
                  {isFuture && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600">
                      <Forward className="size-3" />
                    </span>
                  )}
                  {isToday && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {t("today")}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pb-2">
                    {items.map((ev) => (
                      <MemoEventCard
                        key={ev.id}
                        event={ev}
                        isEditing={editingId === ev.id}
                        editValue={editValue}
                        showFullDate={isFuture}
                        onToggleDone={handleToggleDone}
                        onAbandon={handleAbandon}
                        onRestore={handleRestore}
                        onDelete={handleDelete}
                        onStartEdit={handleStartEdit}
                        onSaveEdit={handleSaveEdit}
                        onEditKeyDown={handleEditKeyDown}
                        onEditChange={handleEditChange}
                        t={t}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
      </div>

      {/* Right sidebar — absolute positioned, stuck to right edge */}
      <aside className="hidden w-48 lg:block absolute right-4 top-8">
        <div className="sticky top-8 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("reportTitle")}</h3>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setWeeklyReportOpen(true)}>
            <FileText className="size-4" />
            {t("genWeeklyReport")}
          </Button>
          {/* <Button variant="outline" className="w-full justify-start gap-2">
            <FileText className="size-4" />
            {t("genMonthlyReport")}
          </Button> */}
        </div>
      </aside>

      {/* Weekly Report Dialog */}
      <WeeklyReportDialog
        open={weeklyReportOpen}
        onOpenChange={setWeeklyReportOpen}
        thisWeekEvents={thisWeekEvents}
        lastWeekEvents={lastWeekEvents}
        t={t}
      />
    </div>
  );
}
