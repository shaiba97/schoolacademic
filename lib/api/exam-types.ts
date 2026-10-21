import { academicApiFetch } from "./client";
import type { ApiExamType, CreateExamTypePayload } from "./types";

export function listExamTypes() {
  return academicApiFetch<ApiExamType[]>("/exam-types");
}

export function getExamType(id: string) {
  return academicApiFetch<ApiExamType>(`/exam-types/${id}`);
}

export function createExamType(payload: CreateExamTypePayload) {
  return academicApiFetch<ApiExamType>("/exam-types", { method: "POST", body: JSON.stringify(payload) });
}

export function updateExamType(id: string, payload: Partial<CreateExamTypePayload>) {
  return academicApiFetch<ApiExamType>(`/exam-types/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteExamType(id: string) {
  return academicApiFetch<{ id: string }>(`/exam-types/${id}`, { method: "DELETE" });
}
