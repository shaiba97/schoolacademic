"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";

const educationLevels = ["SECONDARY", "INTERMEDIATE"] as const;
const secondaryGrades = ["FIRST", "SECOND", "THIRD"] as const;
const intermediateGrades = ["SIXTH", "SEVENTH", "EIGHTH", "NINTH"] as const;
const tracks = ["ART", "SCIENCE"] as const;
const genders = ["BOYS", "GIRLS", "MIXED"] as const;

const schema = z
  .object({
    educationLevel: z.enum(educationLevels),
    grade: z.enum([...secondaryGrades, ...intermediateGrades]),
    track: z.enum(tracks).nullable().optional(),
    gender: z.enum(genders),
    className: z.string().trim().min(2, "Class name required").max(100, "Max 100"),
    capacity: z
      .string()
      .optional()
      .refine((value) => !value || (/^\d+$/.test(value) && Number(value) >= 1), "Capacity must be a whole number of at least 1"),
  })
  .superRefine((data, ctx) => {
    if (data.educationLevel === "SECONDARY") {
      if (!secondaryGrades.includes(data.grade as (typeof secondaryGrades)[number])) {
        ctx.addIssue({ path: ["grade"], code: "custom", message: "Grade must be FIRST, SECOND, or THIRD for SECONDARY" });
      }
      const needsTrack = data.grade === "SECOND" || data.grade === "THIRD";
      if (needsTrack && !data.track) ctx.addIssue({ path: ["track"], code: "custom", message: "Track required for Second/Third" });
      if (!needsTrack && data.track) ctx.addIssue({ path: ["track"], code: "custom", message: "Track must be absent for First" });
    } else {
      if (!intermediateGrades.includes(data.grade as (typeof intermediateGrades)[number])) {
        ctx.addIssue({ path: ["grade"], code: "custom", message: "Grade must be SIXTH, SEVENTH, EIGHTH, or NINTH for INTERMEDIATE" });
      }
      if (data.track) ctx.addIssue({ path: ["track"], code: "custom", message: "Track must be absent for INTERMEDIATE" });
    }
  });

export type ClassFormValues = z.infer<typeof schema>;

const gradeLabels: Record<ClassFormValues["grade"], string> = {
  FIRST: "1st Secondary",
  SECOND: "2nd Secondary",
  THIRD: "3rd Secondary",
  SIXTH: "6th",
  SEVENTH: "7th",
  EIGHTH: "8th",
  NINTH: "9th",
};

const genderLabels: Record<ClassFormValues["gender"], string> = {
  BOYS: "Boys",
  GIRLS: "Girls",
  MIXED: "Mixed",
};

export function ClassForm({
  defaultValues,
  onSubmit,
  onCancel,
  pending = false,
  error = "",
}: {
  defaultValues?: Partial<ClassFormValues>;
  onSubmit: (values: ClassFormValues) => void | Promise<void>;
  onCancel?: () => void;
  pending?: boolean;
  error?: string;
}) {
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      educationLevel: defaultValues?.educationLevel ?? "SECONDARY",
      grade: defaultValues?.grade ?? "FIRST",
      track: defaultValues?.track ?? null,
      gender: (defaultValues?.gender ?? "") as ClassFormValues["gender"],
      className: defaultValues?.className ?? "",
      capacity: defaultValues?.capacity ?? "",
    },
  });
  const [submitError, setSubmitError] = React.useState("");
  const educationLevel = form.watch("educationLevel");
  const grade = form.watch("grade");
  const grades = educationLevel === "SECONDARY" ? secondaryGrades : intermediateGrades;
  const needsTrack = educationLevel === "SECONDARY" && (grade === "SECOND" || grade === "THIRD");

  React.useEffect(() => {
    const validGrades: readonly string[] = grades;
    if (!validGrades.includes(grade)) {
      form.setValue("grade", grades[0] as ClassFormValues["grade"], { shouldValidate: true });
    }
    if (!needsTrack && form.getValues("track")) {
      form.setValue("track", null, { shouldValidate: true });
    }
  }, [form, grades, grade, needsTrack]);

  const submit = form.handleSubmit(async (values) => {
    if (pending) return;
    setSubmitError("");
    try {
      await onSubmit(values);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Unable to save class");
    }
  });

  const visibleError = submitError || error;

  return (
    <Form onSubmit={submit} className="space-y-4">
      <FormItem>
        <FormLabel htmlFor="class-education-level">Education Level *</FormLabel>
        <FormControl>
          <Select id="class-education-level" value={educationLevel} onChange={(event) => form.setValue("educationLevel", event.target.value as ClassFormValues["educationLevel"], { shouldValidate: true })} disabled={pending}>
            {educationLevels.map((level) => <option key={level} value={level}>{level}</option>)}
          </Select>
        </FormControl>
        {form.formState.errors.educationLevel ? <FormMessage>{String(form.formState.errors.educationLevel.message)}</FormMessage> : null}
      </FormItem>

      <FormItem>
        <FormLabel htmlFor="class-grade">Grade *</FormLabel>
        <FormControl>
          <Select id="class-grade" value={grade} onChange={(event) => form.setValue("grade", event.target.value as ClassFormValues["grade"], { shouldValidate: true })} disabled={pending}>
            {grades.map((option) => <option key={option} value={option}>{gradeLabels[option]}</option>)}
          </Select>
        </FormControl>
        {form.formState.errors.grade ? <FormMessage>{String(form.formState.errors.grade.message)}</FormMessage> : null}
      </FormItem>

      {needsTrack ? (
        <FormItem>
          <FormLabel htmlFor="class-track">Track *</FormLabel>
          <FormControl>
            <Select id="class-track" value={form.watch("track") ?? ""} onChange={(event) => form.setValue("track", (event.target.value || null) as ClassFormValues["track"], { shouldValidate: true })} disabled={pending}>
              <option value="">Select track</option>
              {tracks.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </FormControl>
          {form.formState.errors.track ? <FormMessage>{String(form.formState.errors.track.message)}</FormMessage> : null}
        </FormItem>
      ) : null}

      <FormItem>
        <FormLabel htmlFor="class-gender">Determination *</FormLabel>
        <FormControl>
          <Select id="class-gender" value={form.watch("gender") ?? ""} onChange={(event) => form.setValue("gender", event.target.value as ClassFormValues["gender"], { shouldValidate: true })} disabled={pending}>
            <option value="">Select determination</option>
            {genders.map((option) => <option key={option} value={option}>{genderLabels[option]}</option>)}
          </Select>
        </FormControl>
        {form.formState.errors.gender ? <FormMessage>{String(form.formState.errors.gender.message)}</FormMessage> : null}
      </FormItem>

      <FormItem>
        <FormLabel htmlFor="class-name">Class Name *</FormLabel>
        <FormControl>
          <Input id="class-name" placeholder="e.g. Secondary 2 Art" maxLength={100} {...form.register("className")} disabled={pending} />
        </FormControl>
        {form.formState.errors.className ? <FormMessage>{String(form.formState.errors.className.message)}</FormMessage> : null}
      </FormItem>

      <FormItem>
        <FormLabel htmlFor="class-capacity">Capacity <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
        <FormControl>
          <Input id="class-capacity" type="number" min={1} step={1} inputMode="numeric" placeholder="Maximum students" {...form.register("capacity")} disabled={pending} />
        </FormControl>
        {form.formState.errors.capacity ? <FormMessage>{String(form.formState.errors.capacity.message)}</FormMessage> : null}
      </FormItem>

      {visibleError ? <p role="alert" className="text-sm text-destructive">{visibleError}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button> : null}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Class"}</Button>
      </div>
    </Form>
  );
}
