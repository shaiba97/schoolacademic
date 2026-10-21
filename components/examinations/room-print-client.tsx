"use client";

import Link from "next/link";
import { ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ApiExam, ApiHall, ApiTimetableSlot } from "@/lib/api/types";

function dutyName(slot: ApiTimetableSlot): string {
  const user = slot.invigilationDuties?.[0]?.teacher?.user;
  if (!user) return "—";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function subjectLine(slot: ApiTimetableSlot): string {
  const subject = slot.examSubject?.classSubject?.subject?.name ?? "Subject";
  const className = slot.examSubject?.classSubject?.schoolClass?.className ?? "";
  return [subject, className].filter(Boolean).join(" · ");
}

export function RoomPrintClient({
  exam,
  hall,
  slots,
  slotsError = "",
}: {
  exam: ApiExam;
  hall: ApiHall;
  slots: ApiTimetableSlot[];
  slotsError?: string;
}) {
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground print:hidden" aria-label="Breadcrumb">
        <Link href="/examinations" className="hover:text-foreground">Examination Center</Link>
        <ChevronRight size={14} />
        <Link href="/examinations/exam-setup" className="hover:text-foreground">Exam Setup</Link>
        <ChevronRight size={14} />
        <Link href={`/examinations/exam-setup/${exam.id}`} className="hover:text-foreground truncate">
          {exam.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{hall.name}</span>
      </nav>

      <div className="flex flex-wrap gap-3 justify-between items-start print:hidden">
        <p className="text-sm text-muted-foreground">
          Print this card for the hall notice board. Use the browser print dialog to save as PDF.
        </p>
        <Button type="button" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </Button>
      </div>

      {slotsError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {slotsError}
        </p>
      ) : null}

      {slots.length === 0 && !slotsError ? (
        <EmptyState
          title="No sessions in this hall"
          description={`${hall.name} has no scheduled sessions for ${exam.name} yet. Assign the hall to a session first.`}
        />
      ) : null}

      <div className="print:space-y-8 space-y-4">
        {slots.map((slot) => {
          const seats = [...(slot.seatAssignments ?? [])].sort((a, b) =>
            a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }),
          );
          return (
            <section key={slot.id} className="rounded-xl border bg-card p-6 print:rounded-none print:border-black print:shadow-none print:break-inside-avoid">
              <div className="text-center space-y-1 pb-4 border-b print:border-black">
                <h1 className="text-xl font-bold tracking-tight">{exam.name}</h1>
                <p className="text-sm font-medium">
                  {subjectLine(slot)} · {hall.name}
                </p>
                <p className="text-sm text-muted-foreground print:text-black">
                  {slot.date.slice(0, 10)} · {slot.startTime}–{slot.endTime}
                </p>
                <p className="text-sm">
                  Invigilator: <span className="font-semibold">{dutyName(slot)}</span>
                </p>
              </div>

              {seats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No students seated for this session yet.
                </p>
              ) : (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b print:border-black text-left text-muted-foreground print:text-black">
                      <th className="py-2 pr-3 w-14 font-medium">Seat</th>
                      <th className="py-2 pr-3 font-medium">Student name</th>
                      <th className="py-2 pr-3 font-medium">Admission no.</th>
                      <th className="py-2 font-medium">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seats.map((seat) => (
                      <tr key={seat.id} className="border-b last:border-0 print:border-black/30">
                        <td className="py-1.5 pr-3 font-mono">{seat.seatNumber}</td>
                        <td className="py-1.5 pr-3">
                          {[seat.student?.firstName, seat.student?.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{seat.student?.roleNumber ?? "—"}</td>
                        <td className="py-1.5 text-xs">
                          {slot.examSubject?.classSubject?.schoolClass?.className ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="grid grid-cols-2 gap-8 pt-8 mt-4 text-sm">
                <div>
                  <div className="border-t print:border-black pt-1">Invigilator signature</div>
                </div>
                <div>
                  <div className="border-t print:border-black pt-1">School official signature</div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
