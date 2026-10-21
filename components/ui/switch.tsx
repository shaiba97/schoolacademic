"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary border-primary" : "bg-muted border-input",
      )}
      {...props}
    >
      <span className={cn("size-4 rounded-full bg-background shadow transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}
