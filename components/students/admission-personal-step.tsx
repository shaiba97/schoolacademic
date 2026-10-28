"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { FilePicker } from "@/components/ui/file-picker";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Gender } from "@/lib/admission";
import { Eye, EyeOff } from "lucide-react";

type FileVal = { file: File; previewUrl?: string; path: string } | null;

export type PersonalForm = {
  fullname: string;
  motherFullname: string;
  fatherFullname: string;
  dateOfBirth: string;
  gender: Gender;
  address: string;
  phone: string;
  password: string;
  profileImage: FileVal;
  nationalNumberFile: FileVal;
  nationalCardFile: FileVal;
  passportFile: FileVal;
  isTransferred: boolean;
  formerSchoolName: string;
  transferResultFile: FileVal;
};

export const emptyPersonalForm: PersonalForm = {
  fullname: "",
  motherFullname: "",
  fatherFullname: "",
  dateOfBirth: "",
  gender: Gender.MALE,
  address: "",
  phone: "",
  password: "",
  profileImage: null,
  nationalNumberFile: null,
  nationalCardFile: null,
  passportFile: null,
  isTransferred: false,
  formerSchoolName: "",
  transferResultFile: null,
};

export type PersonalStepHandle = {
  isValid: () => boolean | string;
  getValues: () => PersonalForm;
};

/**
 * Pure validation over personal-step values. Lives outside the component so
 * callers (wizard submit, edit submit) can validate the state object directly
 * instead of reading through a ref — the step unmounts when inactive, which
 * used to make every review-step submit fail with the generic message.
 */
export function validatePersonalForm(form: PersonalForm, editMode = false): boolean | string {
  try {
    if (!form.fullname?.trim()) return "Full name required";
    if (!form.motherFullname?.trim()) return "Mother's full name required";
    if (!form.fatherFullname?.trim()) return "Father's full name required";
    if (!form.dateOfBirth) return "Date of birth required";
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "Invalid date of birth";
    if (dob >= new Date()) return "Date of birth must be in the past";
    // sane age 4-30 for school
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 4 || age > 30) return "Age out of plausible range for school (4-30)";
    if (!form.address?.trim()) return "Address required";
    if (form.phone?.trim() && !/^[+]?[\d\s-]{7,20}$/.test(form.phone.trim())) {
      return "Phone number looks invalid (digits, optional + prefix, 7-20 characters)";
    }
    if (!editMode) {
      if (!form.password) return "Password required";
      if (form.password.length < 8) return "Password: min 8 characters";
      // profile image optional per latest spec
      // documents: at least one of national number, national card, passport must be uploaded
      if (!form.nationalNumberFile && !form.nationalCardFile && !form.passportFile) return "At least one document required (national number, national card, or passport)";
    }
    if (form.isTransferred) {
      if (!form.formerSchoolName?.trim()) return "Former school name required when transferred";
      if (!form.transferResultFile) return "Transfer result file required when transferred";
    }
    return true;
  } catch {
    return "Validation error";
  }
}

type Props = {
  values: PersonalForm;
  onChange: (values: PersonalForm) => void;
  onValidChange?: (valid: boolean) => void;
  editMode?: boolean;
};

export const AdmissionPersonalStep = React.forwardRef<PersonalStepHandle, Props>(function AdmissionPersonalStep(
  { values: form, onChange, onValidChange, editMode = false },
  ref,
) {
  const [showPw, setShowPw] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function set(patch: Partial<PersonalForm>) {
    onChange({ ...form, ...patch });
  }

  // clear transfer fields at toggle-off time so stale never submits (§1 notes)
  function setTransferred(next: boolean) {
    if (next) {
      set({ isTransferred: true });
    } else {
      set({ isTransferred: false, formerSchoolName: "", transferResultFile: null });
    }
  }

  const validate = React.useCallback((): boolean | string => validatePersonalForm(form, editMode), [form, editMode]);

  React.useImperativeHandle(
    ref,
    () => ({
      isValid: () => validate(),
      getValues: () => form,
    }),
    [form, validate],
  );

  React.useEffect(() => {
    const v = validate();
    onValidChange?.(v === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const pwStrength = React.useMemo(() => {
    if (!form.password) return 0;
    let s = 0;
    if (form.password.length >= 8) s++;
    if (/[A-Z]/.test(form.password) && /[a-z]/.test(form.password)) s++;
    if (/\d/.test(form.password)) s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;
    return s;
  }, [form.password]);

  function fieldError(field: string): string | undefined {
    if (!touched[field]) return undefined;
    const v = validate();
    if (typeof v === "string") {
      const lower = v.toLowerCase();
      if (lower.includes(field.toLowerCase().replace(/([A-Z])/g, " $1").trim())) return v;
      // fullname exact match only, avoid mother/father bleed
      if (field === "fullname" && lower === "full name required") return v;
      if (field === "motherFullname" && lower.includes("mother")) return v;
      if (field === "fatherFullname" && lower.includes("father")) return v;
      if ((field === "nationalNumberFile" || field === "nationalCardFile" || field === "passportFile") && lower.includes("at least one document")) return v;
      if (field === "address" && lower.includes("address")) return v;
      if (field === "phone" && (lower.includes("phone") || lower.includes("invalid"))) return v;
    }
    return undefined;
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Full name, birth date, gender, login password and required documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fullname */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullname">Full name *</Label>
              <Input
                id="fullname"
                value={form.fullname}
                onBlur={() => setTouched((t) => ({ ...t, fullname: true }))}
                onChange={(e) => set({ fullname: e.target.value })}
                placeholder="Mohammed Ahmed"
                aria-invalid={!!fieldError("fullname")}
              />
              {fieldError("fullname") ? <p className="text-xs text-destructive">{fieldError("fullname")}</p> : <p className="text-xs text-muted-foreground">Single full name field (replaces Full-time)</p>}
            </div>

            {/* Mother's & Father's fullname - side-by-side at sm */}
            <div className="space-y-1.5">
              <Label htmlFor="motherFullname">Mother&apos;s full name *</Label>
              <Input
                id="motherFullname"
                value={form.motherFullname}
                onBlur={() => setTouched((t) => ({ ...t, motherFullname: true }))}
                onChange={(e) => set({ motherFullname: e.target.value })}
                placeholder="Fatima Ahmed"
                aria-invalid={!!fieldError("motherFullname")}
              />
              {fieldError("motherFullname") ? <p className="text-xs text-destructive">{fieldError("motherFullname")}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fatherFullname">Father&apos;s full name *</Label>
              <Input
                id="fatherFullname"
                value={form.fatherFullname}
                onBlur={() => setTouched((t) => ({ ...t, fatherFullname: true }))}
                onChange={(e) => set({ fatherFullname: e.target.value })}
                placeholder="Omar Hassan"
                aria-invalid={!!fieldError("fatherFullname")}
              />
              {fieldError("fatherFullname") ? <p className="text-xs text-destructive">{fieldError("fatherFullname")}</p> : null}
            </div>

            {/* DOB */}
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth *</Label>
              <Input
                id="dob"
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onBlur={() => setTouched((t) => ({ ...t, dateOfBirth: true }))}
                onChange={(e) => set({ dateOfBirth: e.target.value })}
                aria-invalid={!!fieldError("dateOfBirth")}
              />
              {fieldError("dateOfBirth") ? <p className="text-xs text-destructive">{fieldError("dateOfBirth")}</p> : <p className="text-xs text-muted-foreground">Must be in the past; SECONDARY ~10-18y (soft flag 4-30)</p>}
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender *</Label>
              <Select id="gender" value={form.gender} onChange={(e) => set({ gender: e.target.value as Gender })}>
                {Object.values(Gender).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>

            {/* Address */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={form.address}
                onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="Street 12 / District 4 / City"
                aria-invalid={!!fieldError("address")}
              />
              {fieldError("address") ? <p className="text-xs text-destructive">{fieldError("address")}</p> : <p className="text-xs text-muted-foreground">Free text — separate parts with / or , as you like</p>}
            </div>

            {/* Phone (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="+249 91 234 5678"
                aria-invalid={!!fieldError("phone")}
              />
              {fieldError("phone") ? <p className="text-xs text-destructive">{fieldError("phone")}</p> : <p className="text-xs text-muted-foreground">Optional — digits with optional + prefix</p>}
            </div>

            {/* Password — creation only; account passwords never change here */}
            {!editMode ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  aria-invalid={!!fieldError("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-2 size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded ${i < pwStrength ? (pwStrength >= 3 ? "bg-success" : "bg-warning") : "bg-muted"}`} />
                ))}
              </div>
              {fieldError("password") ? <p className="text-xs text-destructive">{fieldError("password")}</p> : <p className="text-xs text-muted-foreground">Policy: min 8, masked in logs</p>}
            </div>
            ) : null}
          </div>

          {/* File pickers — creation only; existing documents are read-only on edit */}
          {!editMode ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FilePicker
              id="profileImage"
              label="Profile image"
              accept="image/jpeg,image/png"
              maxSizeMB={5}
              value={form.profileImage}
              onChange={(v) => set({ profileImage: v })}
              helperText="JPG/PNG only, max 5MB — optional"
              error={touched.profileImage ? fieldError("profileImage") : undefined}
            />
            <FilePicker
              id="nationalNumberFile"
              label="National number"
              accept="image/*,application/pdf"
              maxSizeMB={10}
              value={form.nationalNumberFile}
              onChange={(v) => set({ nationalNumberFile: v })}
              helperText="File scan of national number — image/PDF, max 10MB"
              error={touched.nationalNumberFile ? fieldError("nationalNumberFile") : undefined}
            />
            <FilePicker
              id="nationalCardFile"
              label="National card"
              accept="image/*,application/pdf"
              maxSizeMB={10}
              value={form.nationalCardFile}
              onChange={(v) => set({ nationalCardFile: v })}
              helperText="National ID card scan — image/PDF, max 10MB (distinct from national number)"
              error={touched.nationalCardFile ? fieldError("nationalCardFile") : undefined}
            />
            <FilePicker
              id="passportFile"
              label="Passport"
              accept="image/*,application/pdf"
              maxSizeMB={10}
              value={form.passportFile}
              onChange={(v) => set({ passportFile: v })}
              helperText="Image/PDF, max 10MB"
              error={touched.passportFile ? fieldError("passportFile") : undefined}
            />
            <div className="sm:col-span-2">
              {fieldError("nationalNumberFile") || fieldError("nationalCardFile") || fieldError("passportFile") ? (
                <p className="text-xs text-destructive">{fieldError("nationalNumberFile") ?? fieldError("nationalCardFile") ?? fieldError("passportFile")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">At least one of national number, national card, or passport must be uploaded</p>
              )}
            </div>
          </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Transfer Information — conditional */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Transfer Information</CardTitle>
              <CardDescription>Shown only when transferred from another school is toggled on.</CardDescription>
            </div>
            <Switch checked={form.isTransferred} onCheckedChange={(v) => setTransferred(v)} aria-label="Transferred from another school" />
          </div>
          <p className="text-sm font-medium mt-2">Transferred from another school</p>
        </CardHeader>
        <div className={`grid transition-all ${form.isTransferred ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"} `}>
          <div className="overflow-hidden">
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="formerSchoolName">Former school name *</Label>
                <Input
                  id="formerSchoolName"
                  value={form.formerSchoolName}
                  placeholder="Al-Noor Secondary School"
                  onBlur={() => setTouched((t) => ({ ...t, formerSchoolName: true }))}
                  onChange={(e) => set({ formerSchoolName: e.target.value })}
                  list="school-names"
                />
                <datalist id="school-names">
                  <option value="Al-Noor Secondary School" />
                  <option value="City High School" />
                  <option value="National Academy" />
                </datalist>
                {touched.formerSchoolName && !form.formerSchoolName.trim() && form.isTransferred ? <p className="text-xs text-destructive">Former school name required</p> : null}
              </div>
              <FilePicker
                id="transferResultFile"
                label="Result (file)"
                accept="image/*,application/pdf"
                maxSizeMB={10}
                required={form.isTransferred}
                value={form.transferResultFile}
                onChange={(v) => set({ transferResultFile: v })}
                helperText="Academic result/transcript from former school — image/PDF, max 10MB"
              />
              <p className="text-xs text-muted-foreground">When hidden, values are cleared so stale never submits (§1 notes).</p>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
});
