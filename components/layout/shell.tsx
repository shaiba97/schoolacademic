"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, School, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { Breadcrumb } from "./breadcrumb";
import { SecondaryNav } from "./secondary-nav";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            aria-label={mobileOpen ? t("nav.closeNav") : t("nav.openNav")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <School size={16} />
            </span>
            <span className="hidden sm:inline">{t("nav.portalTitle")}</span>
          </Link>
          <div className="ms-auto flex items-center gap-2 text-sm text-muted-foreground">
            <LanguageToggle />
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              <UserRound size={14} aria-hidden />
              <span className="hidden sm:inline">{t("nav.profile")}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Primary sidebar — desktop */}
        <aside className="hidden lg:flex w-[240px] shrink-0 border-e bg-background flex-col sticky top-14 h-[calc(100vh-56px)] overflow-y-auto print:hidden">
          <nav className="p-3 flex flex-col gap-1" aria-label={t("nav.navLabel")}>
            {NAV_SECTIONS.map((section) => {
              const active = pathname === section.href || pathname.startsWith(section.href + "/");
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon size={18} className="shrink-0" aria-hidden />
                  {t(section.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden print:hidden">
            <button aria-label={t("nav.closeNav")} className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-[280px] h-full bg-background border-e flex flex-col overflow-y-auto shadow-xl">
              <div className="p-3 flex items-center justify-between border-b">
                <span className="font-semibold">{t("nav.mobileLabel")}</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("nav.closeNav")}
                  className="inline-flex size-8 items-center justify-center rounded-lg border"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="p-3 flex flex-col gap-1" aria-label={t("nav.navLabel")}>
                {NAV_SECTIONS.map((section) => {
                  const active = pathname === section.href || pathname.startsWith(section.href + "/");
                  const Icon = section.icon;
                  return (
                    <Link
                      key={section.href}
                      href={section.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      {t(section.labelKey)}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 min-w-0 print:mx-0 print:max-w-none print:px-0 print:py-0">
            <div className="mb-1 print:hidden">
              <Breadcrumb />
            </div>
            <div className="mt-3 min-w-0 overflow-hidden [&:empty]:hidden print:hidden">
              <SecondaryNav />
            </div>
            <div className="mt-4 min-w-0 w-full overflow-hidden">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
