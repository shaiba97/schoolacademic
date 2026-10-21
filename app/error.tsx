"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[640px] p-6">
      <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 flex gap-3">
        <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-destructive">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1 break-words">{error.message || "Validation error"}</p>
          {error.digest ? <p className="text-xs text-muted-foreground mt-1">Digest: {error.digest}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => reset()}>
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => (window.location.href = "/dashboard")}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
