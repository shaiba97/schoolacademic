"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { TIMETABLE_TYPES, type TimetableTypeId } from "@/lib/api/types";

export type TimetableScope = {
  classId: string;
  timetableType: TimetableTypeId;
  examName: string;
  periodsPerDay: number;
};

type Props = {
  classes: Array<{ id: string; className: string }>;
  scope: TimetableScope;
  onChange: (next: TimetableScope) => void;
  disabled?: boolean;
  /** Hide the class selector when the class is already known (e.g. detail pages). */
  hideClass?: boolean;
};

export function TimetableScopeControls({ classes, scope, onChange, disabled = false, hideClass = false }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-end">
      {hideClass ? null : (
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="timetable-scope-class">Class</Label>
        <Select
          id="timetable-scope-class"
          value={scope.classId}
          onChange={(event) => onChange({ ...scope, classId: event.target.value })}
          disabled={disabled || classes.length === 0}
          suppressHydrationWarning
        >
          {classes.length === 0 ? <option value="">No classes available</option> : <option value="">Select class</option>}
          {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.className}</option>)}
        </Select>
      </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="timetable-scope-type">Timetable type</Label>
        <Select
          id="timetable-scope-type"
          value={scope.timetableType}
          onChange={(event) => onChange({ ...scope, timetableType: event.target.value as TimetableTypeId })}
          disabled={disabled}
          suppressHydrationWarning
        >
          {TIMETABLE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </Select>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="timetable-scope-periods">Periods per day</Label>
        <Select
          id="timetable-scope-periods"
          value={String(scope.periodsPerDay)}
          onChange={(event) => onChange({ ...scope, periodsPerDay: Number(event.target.value) })}
          disabled={disabled}
          suppressHydrationWarning
        >
          {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>{count}</option>
          ))}
        </Select>
      </div>
      {scope.timetableType === "EXAMINATION" ? (
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="timetable-scope-exam">Exam name</Label>
          <Input
            id="timetable-scope-exam"
            value={scope.examName}
            onChange={(event) => onChange({ ...scope, examName: event.target.value })}
            placeholder="e.g. Midterm"
            maxLength={150}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
