"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn-style Select wrapping native select but with shadcn API for Form compatibility
// We expose Select, SelectTrigger, SelectContent, SelectItem, SelectValue

type SelectContext = { value?: string; onValueChange?: (v:string)=>void };
const Ctx = React.createContext<SelectContext>({});

export function Select({ children, value, onValueChange, defaultValue }: { children: React.ReactNode; value?: string; onValueChange?: (v:string)=>void; defaultValue?: string }) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const v = value !== undefined ? value : internal;
  const set = onValueChange ?? setInternal;
  return <Ctx.Provider value={{ value: v, onValueChange: set }}><div className="relative">{children}</div></Ctx.Provider>;
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring", className)}>{children} <ChevronDown size={16} className="opacity-50" /></div>;
}
export function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value } = React.useContext(Ctx);
  return <span className={cn("truncate", className)}>{value || placeholder}</span>;
}
export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-1 rounded-lg border bg-popover shadow-md p-1", className)}>{children}</div>;
}
export function SelectItem({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) {
  const { value: cur, onValueChange } = React.useContext(Ctx);
  const active = cur === value;
  return (
    <div role="option" aria-selected={active} onClick={() => onValueChange?.(value)} className={cn("relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 px-2 text-sm outline-none hover:bg-muted focus:bg-muted", active ? "bg-muted font-medium" : "", className)}>
      {children}
    </div>
  );
}

// For compatibility with native Select usage in existing code, also export a simple wrapper that renders native <select> when used as <Select><select>
export function NativeSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm", className)} {...props}>{children}</select>;
}
