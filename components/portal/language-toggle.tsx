"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={locale === "en" ? "Switch to Arabic" : "Switch to English"}
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className={cn(
        "h-8 gap-1.5 rounded-full border-foreground/20 bg-background px-3 text-[13px] font-bold text-foreground shadow-sm hover:bg-primary hover:border-primary hover:text-primary-foreground",
        className,
      )}
    >
      <Languages size={14} className="shrink-0" aria-hidden />
      {locale === "en" ? "ع" : "En"}
    </Button>
  );
}
