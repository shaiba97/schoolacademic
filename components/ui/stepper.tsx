"use client";

import * as React from "react";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type StepDef = {
  id: string;
  label: string;
  description?: string;
  validate?: () => boolean | string;
};

export function Stepper({
  steps,
  active,
  onStepChange,
  onComplete,
  children,
}: {
  steps: StepDef[];
  active: number;
  onStepChange: (idx: number) => void;
  onComplete: () => void;
  children: (active: number) => React.ReactNode;
}) {
  const [attempted, setAttempted] = React.useState<Set<number>>(new Set());

  function safeValidate(validate?: () => boolean | string): boolean | string | true {
    try {
      const v = validate?.();
      if (v === undefined) return true;
      return v;
    } catch {
      return "Validation error";
    }
  }

  function canGo(idx: number) {
    // Can always go backwards; forward requires previous steps valid
    if (idx <= active) return true;
    for (let i = 0; i < idx; i++) {
      const v = safeValidate(steps[i].validate);
      if (v === false || typeof v === "string") return false;
    }
    return true;
  }

  function next() {
    const v = safeValidate(steps[active].validate);
    if (v === false || typeof v === "string") {
      setAttempted((s) => new Set([...s, active]));
      return;
    }
    if (active < steps.length - 1) onStepChange(active + 1);
    else onComplete();
  }

  const error = React.useMemo(() => {
    const v = safeValidate(steps[active].validate);
    return typeof v === "string" ? v : null;
  }, [steps, active]);

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <ol className="flex flex-wrap gap-2" aria-label="Progress">
          {steps.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            const isError = attempted.has(i) && (() => { const v = safeValidate(s.validate); return v === false || typeof v === "string"; })();
            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => canGo(i) && onStepChange(i)}
                  disabled={!canGo(i)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground",
                    isError ? "border-destructive text-destructive" : undefined,
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-xs", isActive ? "bg-primary-foreground/20" : isDone ? "bg-success text-success-foreground" : "bg-muted-foreground/15")}>
                    {isDone ? <Check size={12} /> : i + 1}
                  </span>
                  {s.label}
                </button>
                {i < steps.length - 1 ? <span className="hidden sm:inline text-muted-foreground/40 text-xs" aria-hidden>·</span> : null}
              </li>
            );
          })}
        </ol>
        {steps[active].description ? <p className="text-sm text-muted-foreground mt-2">{steps[active].description}</p> : null}
      </div>

      {/* Body */}
      <div className="p-5">
        {error && attempted.has(active) ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        <div>{children(active)}</div>
      </div>

      {/* Footer */}
      <div className="flex justify-between p-4 border-t bg-muted/30 rounded-b-xl">
        <Button variant="outline" disabled={active === 0} onClick={() => onStepChange(active - 1)}>
          Back
        </Button>
        <Button onClick={next}>{active === steps.length - 1 ? "Submit" : "Next"}</Button>
      </div>
    </div>
  );
}
