import { academicApiFetch } from "./client";
import type { AcademicYearQuery, ApiAcademicTerm, ApiAcademicYear, ApiPaginated, CreateAcademicTermPayload, CreateAcademicYearPayload } from "./types";

export function listAcademicYears(query: AcademicYearQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return academicApiFetch<ApiPaginated<ApiAcademicYear>>(`/academic-years?${params.toString()}`);
}

export function getAcademicYear(id: string) {
  return academicApiFetch<ApiAcademicYear>(`/academic-years/${id}`);
}

export function createAcademicYear(payload: CreateAcademicYearPayload) {
  return academicApiFetch<ApiAcademicYear>("/academic-years", { method: "POST", body: JSON.stringify(payload) });
}

export function updateAcademicYear(id: string, payload: Partial<CreateAcademicYearPayload>) {
  return academicApiFetch<ApiAcademicYear>(`/academic-years/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteAcademicYear(id: string) {
  return academicApiFetch<{ deleted: true }>(`/academic-years/${id}?confirm=true`, { method: "DELETE" });
}

export function listAcademicTerms(yearId: string) {
  return academicApiFetch<ApiAcademicTerm[]>(`/academic-years/${yearId}/terms`);
}

export function createAcademicTerm(yearId: string, payload: CreateAcademicTermPayload) {
  return academicApiFetch<ApiAcademicTerm>(`/academic-years/${yearId}/terms`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateAcademicTerm(yearId: string, termId: string, payload: Partial<CreateAcademicTermPayload>) {
  return academicApiFetch<ApiAcademicTerm>(`/academic-years/${yearId}/terms/${termId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteAcademicTerm(yearId: string, termId: string) {
  return academicApiFetch<{ deleted: true }>(`/academic-years/${yearId}/terms/${termId}`, { method: "DELETE" });
}
