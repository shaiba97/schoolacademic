"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffProfile, getCurrentAcademicYear, updateOwnDetails, type StaffProfile } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/locale-provider";

export function ProfileClient() {
  const router = useRouter();
  const { t } = useI18n();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [yearName, setYearName] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // Editable personal fields
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const load = React.useCallback(() => {
    getStaffProfile()
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setPhone(data.phone ?? "");
        setError("");
        setLoading(false);
      })
      .catch((cause) => {
        // A refused session must not leave the card spinning forever: the
        // proxy sends the user to the login screen, and the card says why.
        if (cause instanceof ApiError && cause.status === 401) {
          setError(t("profile.unableToLoad"));
          setLoading(false);
          return;
        }
        setError(cause instanceof ApiError ? cause.message : t("profile.unableToLoad"));
        setLoading(false);
      });
    getCurrentAcademicYear()
      .then((year) => setYearName(year?.name ?? null))
      .catch(() => setYearName(null));
  }, [t]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await updateOwnDetails({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || null,
      });
      setSaved(true);
      load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>{error || t("profile.notFound")}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load}>
              <RefreshCw size={14} aria-hidden /> {t("common.retry")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleLogout()}>
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const detail = (label: string, value: React.ReactNode, mono = false) => (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium break-all text-end ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>

      {/* Card 1: Personal & Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("profile.personalCard")}</CardTitle>
          <CardDescription>{t("profile.personalCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2" id="profile-form">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-first-name">{t("profile.firstName")}</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-last-name">{t("profile.lastName")}</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-staff-id">{t("profile.staffId")}</Label>
              <Input id="profile-staff-id" value={profile.staffNumber ?? "—"} readOnly disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-department">{t("profile.department")}</Label>
              <Input id="profile-department" value={profile.positionTitle} readOnly disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-email">{t("profile.email")}</Label>
              <Input id="profile-email" type="email" value={profile.email ?? "—"} readOnly disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-phone">{t("profile.phone")}</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? t("profile.saving") : t("profile.updateInfo")}
              </Button>
              {saved ? (
                <span role="status" className="text-sm text-emerald-600 dark:text-emerald-500">
                  {t("profile.saved")}
                </span>
              ) : null}
              {saveError ? (
                <span role="alert" className="text-sm text-destructive">
                  {saveError}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Card 2: School & Institution Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("profile.schoolCard")}</CardTitle>
          <CardDescription>{t("profile.schoolCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col divide-y">
            {detail(t("profile.school"), profile.tenant.name)}
            {detail(t("profile.branchId"), profile.tenant.id, true)}
            {detail(
              t("profile.activeYear"),
              yearName ?? <span className="text-muted-foreground">{t("profile.noYear")}</span>,
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <dt className="text-sm text-muted-foreground">{t("profile.position")}</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {profile.roles.length === 0 ? (
                  <Badge variant="outline">—</Badge>
                ) : (
                  profile.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="font-mono text-xs">
                      {role}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Card 3: Session Control & Logout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("profile.sessionCard")}</CardTitle>
          <CardDescription>{t("profile.sessionCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs text-muted-foreground">{t("profile.logoutDesc")}</p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void handleLogout()}
          >
            <LogOut size={14} aria-hidden /> {t("profile.logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
