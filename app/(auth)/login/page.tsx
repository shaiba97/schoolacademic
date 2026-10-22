"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { useI18n } from "@/lib/i18n/locale-provider";

type SchoolChoice = { id: string; name: string };

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<SchoolChoice[] | null>(null);

  async function send(identifierValue: string, passwordValue: string, tenantId?: string) {
    setError("");
    setLoading(true);

    const payload: Record<string, string> = {
      staffNumber: identifierValue.trim(),
      password: passwordValue,
    };
    if (tenantId) payload.tenantId = tenantId;

    try {
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => undefined);

      if (res.status === 409 && Array.isArray(data?.tenants)) {
        setChoices(data.tenants as SchoolChoice[]);
        return;
      }
      if (res.status === 403 && typeof data?.message === "string" && data.message.toLowerCase().includes("no academic affairs access")) {
        setError(t("login.noAccess"));
        return;
      }
      if (!res.ok) {
        setError(
          typeof data?.message === "string" ? data.message : t("login.failed"),
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("login.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send(identifier, password);
  }

  async function handleSchoolPick(school: SchoolChoice) {
    await send(identifier, password, school.id);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-4 end-4">
        <LanguageToggle />
      </div>
      {choices ? (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t("login.selectSchool")}</CardTitle>
            <CardDescription>{t("login.selectSchoolHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {choices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("login.noAccess")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {choices.map((school) => (
                  <Button
                    key={school.id}
                    type="button"
                    variant="outline"
                    className="justify-between gap-2"
                    disabled={loading}
                    onClick={() => void handleSchoolPick(school)}
                  >
                    <span className="truncate">{school.name}</span>
                    <span aria-hidden className="ms-1 text-muted-foreground">→</span>
                  </Button>
                ))}
              </div>
            )}
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap size={20} aria-hidden />
            </span>
            <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">{t("login.staffId")}</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("login.staffIdPlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
