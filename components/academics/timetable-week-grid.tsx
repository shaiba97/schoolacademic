"use client";

import * as React from "react";
import { Copy, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimetableDay } from "./timetable-utils";
import { dayLabel, periodLabel } from "./timetable-utils";

export type WeekGridRow = { slot: number; band: string };

export type WeekGridCell = {
  isBreak: boolean;
  primary: string;
  secondary?: string;
  tertiary?: string;
  /** Breaks attached after this lesson in the day row. Breaks never take a period number. */
  attached?: Array<{ primary: string; secondary?: string; onOpen?: () => void }>;
};

export type WeekGridDraftKind = "empty" | "break" | "lesson";

export type WeekGridDraft = {
  kind: WeekGridDraftKind;
  startTime: string;
  endTime: string;
  subjectId?: string;
  teacherId?: string;
  sport?: string;
};

export type WeekGridEditorContext = {
  day: TimetableDay;
  slot: number;
  draft: WeekGridDraft;
  patch: (next: Partial<WeekGridDraft>) => void;
  pending: boolean;
};

type ActiveCell = { day: TimetableDay; slot: number };

type Props = {
  title: string;
  meta?: React.ReactNode;
  days: readonly TimetableDay[];
  rows: WeekGridRow[];
  /** Optional per-day caption rendered under the day name, e.g. "5/7 · 2 breaks". */
  dayMeta?: (day: TimetableDay) => React.ReactNode;
  cellAt: (day: TimetableDay, slot: number) => WeekGridCell | undefined;
  active: ActiveCell | null;
  draft: WeekGridDraft | null;
  onOpen: (day: TimetableDay, slot: number) => void;
  onClose: () => void;
  onPatch: (next: Partial<WeekGridDraft>) => void;
  onSaveCell: () => void;
  onCopyToAllDays?: () => void;
  /** Row/column bulk selection. All optional: read-only views omit them. */
  selectedDay?: TimetableDay | null;
  selectedSlot?: number | null;
  onSelectDay?: (day: TimetableDay) => void;
  onSelectSlot?: (slot: number) => void;
  onClearSelection?: () => void;
  onBulkClear?: () => void;
  bulkClearLabel?: string;
  onClearCell?: (day: TimetableDay, slot: number) => void;
  renderEditor?: (context: WeekGridEditorContext) => React.ReactNode;
  editorError?: string;
  editorPending?: boolean;
  dirtyCount?: number;
  onSaveWeek?: () => void;
  saveLabel?: string;
  pending?: boolean;
  onPrint?: () => void;
  weekError?: string;
  /** Blocking problems: the save is refused until every one of these is fixed. */
  problems?: string[];
  /** Advisory notes that do not block, e.g. on the derived teacher view. */
  warnings?: string[];
  notice?: string;
  loading?: boolean;
  emptyHint?: string;
  /** Render the table even when every cell is empty (blank-template creation flow). */
  showEmptyGrid?: boolean;
  /** Overrides the cell-dialog title, e.g. when editing an attached break. */
  dialogTitle?: React.ReactNode;
  /** Renders cells as inert text instead of buttons: the derived teacher view. */
  readOnly?: boolean;
};

export function TimetableWeekGrid({
  title,
  meta,
  days,
  rows,
  dayMeta,
  cellAt,
  active,
  draft,
  onOpen,
  onClose,
  onPatch,
  onSaveCell,
  onCopyToAllDays,
  selectedDay = null,
  selectedSlot = null,
  onSelectDay,
  onSelectSlot,
  onClearSelection,
  onBulkClear,
  bulkClearLabel,
  onClearCell,
  renderEditor,
  editorError,
  editorPending = false,
  dirtyCount = 0,
  onSaveWeek,
  saveLabel = "Save timetable",
  pending = false,
  onPrint,
  weekError,
  problems = [],
  warnings = [],
  notice,
  loading = false,
  emptyHint,
  showEmptyGrid = false,
  dialogTitle,
  readOnly = false,
}: Props) {
  const cellRefs = React.useRef(new Map<string, HTMLButtonElement>());

  const registerCell = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) cellRefs.current.set(key, node);
    else cellRefs.current.delete(key);
  };

  const focusCell = (day: TimetableDay, slot: number) => {
    const node = cellRefs.current.get(`${day}:${slot}`);
    if (node) node.focus();
  };

  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, day: TimetableDay, slot: number) => {
    const dayIndex = days.indexOf(day);
    if (dayIndex < 0) return;
    let nextDay = day;
    let nextSlot = slot;
    switch (event.key) {
      // Rows are days, columns are periods.
      case "ArrowRight": nextSlot = Math.min(slot + 1, rows[rows.length - 1]?.slot ?? slot); break;
      case "ArrowLeft": nextSlot = Math.max(slot - 1, rows[0]?.slot ?? slot); break;
      case "ArrowDown": nextDay = days[Math.min(dayIndex + 1, days.length - 1)]; break;
      case "ArrowUp": nextDay = days[Math.max(dayIndex - 1, 0)]; break;
      case "Home": nextDay = days[0]; break;
      case "End": nextDay = days[days.length - 1]; break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        onClearCell?.(day, slot);
        return;
      default: return;
    }
    event.preventDefault();
    focusCell(nextDay, nextSlot);
  };

  const hasContent = rows.some((row) => days.some((day) => Boolean(cellAt(day, row.slot))));  const hasSelection = selectedDay != null || selectedSlot != null;
  const selectable = !readOnly && (onSelectDay || onSelectSlot);

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {meta ? <div className="mt-0.5 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {onSaveWeek ? (
          <Button type="button" onClick={onSaveWeek} disabled={pending || dirtyCount === 0} className="print:hidden">
            <Save size={15} aria-hidden /> {pending ? "Saving…" : dirtyCount > 0 ? `${saveLabel} (${dirtyCount})` : saveLabel}
          </Button>
        ) : null}
        {onPrint ? (
          <Button type="button" variant="outline" onClick={onPrint} className="print:hidden">
            <Printer size={15} aria-hidden /> Print
          </Button>
        ) : null}
      </div>

      {hasSelection && onBulkClear ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden" role="status">
          <p className="text-sm text-muted-foreground">
            {selectedDay != null ? `${dayLabel(selectedDay)} selected` : `${periodLabel(selectedSlot as number)} selected`}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onBulkClear}>{bulkClearLabel ?? "Clear selection"}</Button>
          {onClearSelection ? <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>Cancel</Button> : null}
        </div>
      ) : null}

      {problems.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 print:hidden">
          <p className="font-medium">Fix before saving</p>
          <ul className="list-inside list-disc">
            {problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 print:hidden">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}

      {weekError ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive print:hidden">{weekError}</div>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 print:hidden">{notice}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label={`Loading ${title}`}>
            {rows.map((row) => <Skeleton key={row.slot} className="h-14 w-full" />)}
          </div>
        ) : !hasContent && !showEmptyGrid ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{emptyHint ?? "Nothing scheduled yet."}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-[104px] border-b bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Day</th>
                {rows.map((row) => (
                  <th key={row.slot} scope="col" className="border-b border-l bg-muted/40 px-2 py-2 text-center text-xs font-semibold tracking-wide">
                    {selectable && onSelectSlot ? (
                      <button
                        type="button"
                        onClick={() => onSelectSlot(row.slot)}
                        aria-pressed={selectedSlot === row.slot}
                        aria-label={`Select ${periodLabel(row.slot)} column`}
                        className={`mx-auto block rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${selectedSlot === row.slot ? "bg-accent text-accent-foreground" : ""}`}
                      >
                        <span className="block">{periodLabel(row.slot)}</span>
                        {row.band ? <span className="mt-0.5 block font-normal text-muted-foreground">{row.band}</span> : null}
                      </button>
                    ) : (
                      <>
                        <span className="block">{periodLabel(row.slot)}</span>
                        {row.band ? <span className="mt-0.5 block font-normal text-muted-foreground">{row.band}</span> : null}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <th scope="row" className="border-b px-3 py-1.5 text-left align-top">
                    {selectable && onSelectDay ? (
                      <button
                        type="button"
                        onClick={() => onSelectDay(day)}
                        aria-pressed={selectedDay === day}
                        aria-label={`Select ${dayLabel(day)} row`}
                        className={`block w-full rounded text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${selectedDay === day ? "bg-accent text-accent-foreground" : ""}`}
                      >
                        <span className="block text-xs font-semibold">{dayLabel(day)}</span>
                        {dayMeta ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{dayMeta(day)}</span> : null}
                      </button>
                    ) : (
                      <>
                        <span className="block text-xs font-semibold">{dayLabel(day)}</span>
                        {dayMeta ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{dayMeta(day)}</span> : null}
                      </>
                    )}
                  </th>
                  {rows.map((row) => {
                    const cell = cellAt(day, row.slot);
                    const key = `${day}:${row.slot}`;
                    const isActive = active?.day === day && active?.slot === row.slot;
                    const isSelected = selectedDay === day || selectedSlot === row.slot;
                    const classes = `block min-h-[64px] w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                      cell
                        ? cell.isBreak
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-primary/30 bg-primary/10"
                        : "border-transparent"
                    }${isSelected ? " bg-accent/50" : ""}${readOnly ? "" : " hover:border-input hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"}`;
                    const content = cell ? (
                      <>
                        <span className={`block truncate text-xs font-semibold ${cell.isBreak ? "text-amber-700" : "text-primary"}`}>{cell.primary}</span>
                        {cell.secondary ? <span className="block truncate text-xs text-foreground/80">{cell.secondary}</span> : null}
                        {cell.tertiary ? <span className="block truncate text-xs text-muted-foreground">{cell.tertiary}</span> : null}
                      </>
                    ) : (
                      <span className="block text-xs text-muted-foreground/60">—</span>
                    );
                    const attached = cell?.attached?.map((chip, index) => {
                      const chipKey = `${key}:break-${index}`;
                      const chipContent = (
                        <>
                          <span className="block truncate text-xs font-semibold text-amber-700">{chip.primary}</span>
                          {chip.secondary ? <span className="block truncate text-xs text-muted-foreground">{chip.secondary}</span> : null}
                        </>
                      );
                      return readOnly || !chip.onOpen ? (
                        <div key={chipKey} className="mt-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-1" aria-label={`${chip.primary} break`}>
                          {chipContent}
                        </div>
                      ) : (
                        <button
                          key={chipKey}
                          type="button"
                          onClick={() => chip.onOpen?.()}
                          aria-label={`Edit ${chip.primary} break`}
                          className="mt-1 block w-full rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-1 text-left hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {chipContent}
                        </button>
                      );
                    });
                    const label = `${dayLabel(day)} period ${row.slot} — ${cell ? `${cell.primary}${cell.isBreak ? " (break)" : ""}` : "empty"}`;

                    return (
                      <td key={key} className="border-b border-l p-1 align-top">
                        {readOnly ? (
                          <div className={classes} aria-label={label}>{content}{attached}</div>
                        ) : (
                          <>
                            <button
                              ref={registerCell(key)}
                              type="button"
                              onClick={() => onOpen(day, row.slot)}
                              onKeyDown={(event) => handleCellKeyDown(event, day, row.slot)}
                              aria-label={label}
                              aria-expanded={isActive}
                              className={classes}
                            >
                              {content}
                            </button>
                            {attached}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={Boolean(active && draft)} onOpenChange={(open) => { if (!open && !editorPending) onClose(); }}>
        <DialogContent className="sm:max-w-[440px]">
          {active && draft ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogTitle ?? <>{dayLabel(active.day)} · Period {active.slot}</>}
                </DialogTitle>
                <DialogDescription>Editing one cell of the week. Other days stay as they are.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-6">
                {renderEditor ? (
                  renderEditor({ day: active.day, slot: active.slot, draft, patch: onPatch, pending: editorPending })
                ) : null}
                {editorError ? <p role="alert" className="text-sm text-destructive">{editorError}</p> : null}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <div>
                  {onCopyToAllDays ? (
                    <Button type="button" variant="outline" size="sm" onClick={onCopyToAllDays} disabled={editorPending}>
                      <Copy size={14} aria-hidden /> Copy to all days
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={editorPending}>Cancel</Button>
                  <Button type="button" onClick={onSaveCell} disabled={editorPending}>{editorPending ? "Saving…" : "Save cell"}</Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
