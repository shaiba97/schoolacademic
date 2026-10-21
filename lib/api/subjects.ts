import { academicApiFetch } from "./client";
import type { ApiClassSubject, ApiPaginated, ApiSubject, BatchCreateSubjectsPayload, BatchCreateSubjectsResult, CreateSubjectPayload } from "./types";

export function listSubjects(query: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return academicApiFetch<ApiPaginated<ApiSubject>>(`/subjects?${params.toString()}`);
}

export function getSubject(id: string) {
  return academicApiFetch<ApiSubject>(`/subjects/${id}`);
}

export function createSubject(payload: CreateSubjectPayload) {
  return academicApiFetch<ApiSubject>("/subjects", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSubject(id: string, payload: Partial<CreateSubjectPayload>) {
  return academicApiFetch<ApiSubject>(`/subjects/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteSubject(id: string) {
  return academicApiFetch<{ deleted: true }>(`/subjects/${id}`, { method: "DELETE" });
}

/** Creates every row of the wizard and optionally assigns them all to classes, in one request. */
export function batchCreateSubjects(payload: BatchCreateSubjectsPayload) {
  return academicApiFetch<BatchCreateSubjectsResult>("/subjects/batch", { method: "POST", body: JSON.stringify(payload) });
}

/** Attaches an existing subject to the given classes. */
export function assignSubjectToClasses(subjectId: string, classIds: string[]) {
  return academicApiFetch<{ assigned: number; skippedClasses: string[] }>(`/subjects/${subjectId}/assign-classes`, {
    method: "POST",
    body: JSON.stringify({ classIds }),
  });
}

export function listClassSubjects(classId: string) {
  return academicApiFetch<ApiClassSubject[]>(`/subjects/classes/${classId}`);
}

export function assignSubject(classId: string, payload: { subjectId: string; teacherId?: string }) {
  return academicApiFetch<ApiClassSubject>(`/subjects/classes/${classId}/assign`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateClassSubjectTeacher(classSubjectId: string, teacherId?: string | null) {
  return academicApiFetch<ApiClassSubject>(`/subjects/${classSubjectId}/teacher`, { method: "PUT", body: JSON.stringify({ teacherId }) });
}

export function removeClassSubject(classSubjectId: string) {
  return academicApiFetch<{ deleted: true }>(`/subjects/class-subjects/${classSubjectId}`, { method: "DELETE" });
}
