"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FilePicker } from "@/components/ui/file-picker";
import { isSudanesePhone, toE164Sudanese } from "@/lib/validation/phone";
import { getNextTeacherEmployeeNumber } from "@/lib/api/teachers";
import type { ApiDepartment } from "@/lib/api/types";
import type { TeacherDocumentType } from "@/lib/api/storage";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

export type FileVal = { file: File; previewUrl?: string; path: string } | null;
export type GenderValue = "MALE" | "FEMALE";

const createSchema = z.object({
  fullname: z.string().min(2, "Full name is required").max(60),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((value) => isSudanesePhone(value), { message: "Invalid Sudanese phone — must be +249 9XXXXXXXX or 09XXXXXXXX" }),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => new Date(value) < new Date(), { message: "Date of birth must be in the past" }),
  departmentId: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profileImage: z.custom<FileVal>().nullish(),
});

const editSchema = z.object({
  fullname: z.string().min(2, "Full name is required").max(60),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((value) => isSudanesePhone(value), { message: "Invalid Sudanese phone" }),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  departmentId: z.string(),
  password: z.string().optional(),
  profileImage: z.custom<FileVal>().nullish(),
});

export type TeacherFormValues = {
  fullname: string;
  phone: string;
  gender: GenderValue;
  dateOfBirth: string;
  departmentId: string;
  password: string;
  profileImage: FileVal;
};

export type TeacherFormErrors = {
  form?: string;
  profileImage?: string;
};

const emptyValues: TeacherFormValues = {
  fullname: "",
  phone: "",
  gender: "MALE",
  dateOfBirth: "",
  departmentId: "",
  password: "",
  profileImage: null,
};

export function TeacherForm({
  defaultValues,
  departments = [],
  onSubmit,
  onCancel,
  isEdit = false,
  pending = false,
  error,
}: {
  defaultValues?: Partial<TeacherFormValues>;
  departments?: ApiDepartment[];
  onSubmit: (
    values: TeacherFormValues,
    files: Array<{ documentType: TeacherDocumentType; file: File }>,
  ) => Promise<void>;
  onCancel?: () => void;
  isEdit?: boolean;
  pending?: boolean;
  error?: TeacherFormErrors;
}) {
  const schema = isEdit ? editSchema : createSchema;
  const values = { ...emptyValues, ...defaultValues };

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: values,
  });

  const [showPw, setShowPw] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const departmentId = form.watch("departmentId");
  const { t } = useI18n();

  const VALIDATION_MESSAGE_KEYS: Record<string, MessageKey> = {
    "Full name is required": "teachers.validation.fullnameRequired",
    "Phone number is required": "teachers.validation.phoneRequired",
    "Invalid Sudanese phone — must be +249 9XXXXXXXX or 09XXXXXXXX": "teachers.validation.phoneInvalid",
    "Invalid Sudanese phone": "teachers.validation.phoneInvalidShort",
    "Date of birth is required": "teachers.validation.dobRequired",
    "Date of birth must be in the past": "teachers.validation.dobPast",
    "Password must be at least 8 characters": "teachers.validation.passwordMin",
  };
  function fieldError(message: string | undefined) {
    if (!message) return null;
    const key = VALIDATION_MESSAGE_KEYS[message];
    return key ? t(key) : message;
  }

  // The employee number is assigned server-side from a live sequence, so the
  // form can only show a preview. Out-of-order responses are discarded by
  // request id so a slow earlier request cannot overwrite a newer one.
  const [nextNumber, setNextNumber] = React.useState("");
  const [numberState, setNumberState] = React.useState<"idle" | "loading" | "error">("idle");
  const latestRequest = React.useRef(0);

  React.useEffect(() => {
    if (isEdit) return;
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    let active = true;

    setNumberState("loading");
    getNextTeacherEmployeeNumber(departmentId || undefined)
      .then((result) => {
        if (!active || latestRequest.current !== requestId) return;
        setNextNumber(result.employeeNumber);
        setNumberState("idle");
      })
      .catch(() => {
        if (!active || latestRequest.current !== requestId) return;
        setNextNumber("");
        setNumberState("error");
      });

    return () => {
      active = false;
    };
  }, [departmentId, isEdit]);

  const submit = form.handleSubmit(async (formValues) => {
    const files: Array<{ documentType: TeacherDocumentType; file: File }> = [];
    const profileImage = formValues.profileImage;
    if (profileImage?.file) files.push({ documentType: "PROFILE_IMAGE", file: profileImage.file });
    setSubmitError("");
    try {
      await onSubmit(
        {
          ...formValues,
          phone: toE164Sudanese(formValues.phone),
          departmentId: formValues.departmentId || "",
        },
        files,
      );
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t("teachers.errorSaveFailed"));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      {submitError ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      {error?.form ? <p role="alert" className="text-sm text-destructive">{error.form}</p> : null}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("teachers.cardPersonal")}</CardTitle>
          <CardDescription>{t("teachers.cardPersonalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex gap-4 items-start">
              <div className="shrink-0">
                {form.watch("profileImage")?.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.watch("profileImage")!.previewUrl} alt="Profile preview" className="size-20 rounded-full object-cover border" />
                ) : (
                  <div className="size-20 rounded-full border-2 border-dashed bg-muted flex items-center justify-center">
                    <ImageIcon size={24} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>{t("teachers.labelProfileImage")}</Label>
                <FilePicker
                  id="teacher-profile"
                  label={t("teachers.labelProfileImage")}
                  accept="image/jpeg,image/png"
                  maxSizeMB={5}
                  value={form.watch("profileImage")}
                  onChange={(value) => form.setValue("profileImage", value, { shouldValidate: true })}
                  helperText={t("teachers.helperImage")}
                />
                {error?.profileImage && <p className="text-xs text-destructive">{error.profileImage}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullname">{t("teachers.labelFullName")}</Label>
              <Input id="fullname" placeholder="Ahmed Ali" {...form.register("fullname")} aria-invalid={!!form.formState.errors.fullname} />
              {form.formState.errors.fullname ? <p className="text-xs text-destructive">{fieldError(form.formState.errors.fullname?.message)}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("teachers.labelPhone")}</Label>
              <Input id="phone" type="tel" inputMode="tel" placeholder="+249 91 234 5678" {...form.register("phone")} aria-invalid={!!form.formState.errors.phone} />
              {form.formState.errors.phone ? <p className="text-xs text-destructive">{fieldError(form.formState.errors.phone?.message)}</p> : <p className="text-xs text-muted-foreground">{t("teachers.helperPhone")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">{t("teachers.labelGender")}</Label>
              <Select id="gender" value={form.watch("gender")} onChange={(event) => form.setValue("gender", event.target.value as GenderValue, { shouldValidate: true })}>
                <option value="MALE">{t("teachers.genderMale")}</option>
                <option value="FEMALE">{t("teachers.genderFemale")}</option>
              </Select>
              {form.formState.errors.gender ? <p className="text-xs text-destructive">{fieldError(form.formState.errors.gender?.message)}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">{t("teachers.labelDob")}</Label>
              <Input id="dob" type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("dateOfBirth")} aria-invalid={!!form.formState.errors.dateOfBirth} />
              {form.formState.errors.dateOfBirth ? <p className="text-xs text-destructive">{fieldError(form.formState.errors.dateOfBirth?.message)}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("teachers.cardAcademic")}</CardTitle>
          <CardDescription>{t("teachers.cardAcademicDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="department">{t("teachers.labelDepartment")}</Label>
            <Select id="department" value={form.watch("departmentId")} onChange={(event) => form.setValue("departmentId", event.target.value, { shouldValidate: true })}>
              <option value="">{t("teachers.deptUnassigned")}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{t("teachers.noteDepartments")}</p>
          </div>

          {!isEdit ? (
            <div className="space-y-1.5 border-t pt-3">
              <Label htmlFor="employee-number">{t("teachers.labelEmployeeId")}</Label>
              <Input
                id="employee-number"
                readOnly
                aria-readonly="true"
                tabIndex={-1}
                value={
                  numberState === "loading"
                    ? t("teachers.employeeGenerating")
                    : numberState === "error"
                      ? ""
                      : nextNumber
                }
                placeholder={numberState === "error" ? t("teachers.employeePlaceholderAssigned") : nextNumber}
                aria-describedby="employee-number-help"
                className="font-mono bg-muted/40"
              />
              <p id="employee-number-help" className="text-xs text-muted-foreground">
                {numberState === "error"
                  ? t("teachers.employeeError")
                  : t("teachers.employeeHelp")}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isEdit ? t("teachers.cardChangePassword") : t("teachers.cardAccount")}</CardTitle>
          <CardDescription>{isEdit ? t("teachers.cardChangePasswordDesc") : t("teachers.cardAccountDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="password">{isEdit ? t("teachers.labelNewPassword") : t("teachers.labelPassword")}</Label>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} placeholder={isEdit ? t("teachers.phPasswordKeep") : t("teachers.phPasswordMin")} autoComplete="new-password" {...form.register("password")} className="pr-10" aria-invalid={!!form.formState.errors.password} />
            <button type="button" aria-label={showPw ? t("teachers.ariaHidePassword") : t("teachers.ariaShowPassword")} onClick={() => setShowPw((value) => !value)} className="absolute right-2 top-2 size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.formState.errors.password ? <p className="text-xs text-destructive">{fieldError(form.formState.errors.password?.message)}</p> : null}
          {!isEdit ? <p className="text-xs text-muted-foreground">{t("teachers.notePassword")}</p> : null}
        </CardContent>
      </Card>

      {/* Identification documents are managed on the teacher record, not here,
          so that any number of named documents can be added over time. */}
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t("teachers.noteIdDocuments")}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
              {t("common.cancel")}
            </Button>
        ) : null}
        <Button type="submit" disabled={pending || form.formState.isSubmitting}>
          {pending ? t("common.saving") : isEdit ? t("teachers.btnSaveChanges") : t("teachers.btnCreateTeacher")}
        </Button>
      </div>
    </form>
  );
}