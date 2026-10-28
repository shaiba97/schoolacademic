"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FormProps = React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode };
export function Form({ className, children, ...props }: FormProps) {
  return <form className={cn("space-y-4", className)} {...props}>{children}</form>;
}
export function FormField({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}
export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <Label className={className} {...props} />;
}
export function FormControl({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}
export function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className={cn("text-xs text-destructive", className)} {...props}>{children}</p>;
}
