"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o:boolean)=>void; children: React.ReactNode }) {
  return <>{React.Children.map(children, (child) => React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ open?:boolean; onOpenChange?: (o:boolean)=>void }>, { open, onOpenChange }) : child)}</>;
}
export function SheetContent({ open, onOpenChange, children, className, side="right" }: { open?: boolean; onOpenChange?: (o:boolean)=>void; children: React.ReactNode; className?: string; side?: "right"|"bottom" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} aria-hidden />
      <div role="dialog" aria-modal="true" className={cn("relative z-50 bg-card border-l shadow-lg overflow-y-auto", side==="bottom" ? "w-full max-h-[85vh] rounded-t-xl" : "w-[480px] max-w-[90vw] h-full", className)}>
        <button onClick={() => onOpenChange?.(false)} aria-label="Close sheet" className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted">
          <X size={16} />
        </button>
        <div className="p-6 pt-10">{children}</div>
      </div>
    </div>
  );
}
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 mb-4", className)} {...props} />;
}
export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
