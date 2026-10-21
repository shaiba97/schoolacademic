import { academicApiFetch } from "./client";
import type { ApiPaginated, ApiSchoolClass, CreateClassPayload } from "./types";

export function listClasses(query: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return academicApiFetch<ApiPaginated<ApiSchoolClass>>(`/classes?${params.toString()}`);
}

export function getClass(id: string) {
  return academicApiFetch<ApiSchoolClass>(`/classes/${id}`);
}

export function createClass(payload: CreateClassPayload) {
  return academicApiFetch<ApiSchoolClass>("/classes", { method: "POST", body: JSON.stringify(payload) });
}

export function updateClass(id: string, payload: Partial<CreateClassPayload>) {
  return academicApiFetch<ApiSchoolClass>(`/classes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteClass(id: string) {
  return academicApiFetch<{ deleted: true }>(`/classes/${id}`, { method: "DELETE" });
}
