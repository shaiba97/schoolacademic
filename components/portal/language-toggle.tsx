"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn("inline-flex items-center rounded-lg border bg-background p-0.5", className)}
    >
      {(["en", "ar"] as const).map((entry) => (
        <Button
          key={entry}
          type="button"
          variant={locale === entry ? "default" : "ghost"}
          size="sm"
          lang={entry}
          aria-pressed={locale === entry}
          onClick={() => setLocale(entry)}
          className="h-7 px-2 text-xs"
        >
          {entry === "en" ? "EN" : "عربي"}
        </Button>
      ))}
    </div>
  );
}
