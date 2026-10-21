"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function AlertDialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o:boolean)=>void; children: React.ReactNode }) {
  return <>{React.Children.map(children, (c) => React.isValidElement(c) ? React.cloneElement(c as React.ReactElement<{ open?:boolean; onOpenChange?:(o:boolean)=>void}>, { open, onOpenChange }) : c)}</>;
}
export function AlertDialogContent({ open, onOpenChange, children, className }: { open?: boolean; onOpenChange?: (o:boolean)=>void; children: React.ReactNode; className?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} aria-hidden />
      <div role="alertdialog" aria-modal="true" className={cn("relative z-50 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg", className)}>{children}</div>
    </div>
  );
}
export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("space-y-2", className)} {...props} />; }
export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn("text-lg font-semibold", className)} {...props} />; }
export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />; }
export function AlertDialogCancel({ children, onClick, className }: { children: React.ReactNode; onClick?: ()=>void; className?: string }) { return <Button variant="outline" onClick={onClick} className={className}>{children}</Button>; }
export function AlertDialogAction({ children, onClick, className }: { children: React.ReactNode; onClick?: ()=>void; className?: string }) { return <Button variant="destructive" onClick={onClick} className={className}>{children}</Button>; }
