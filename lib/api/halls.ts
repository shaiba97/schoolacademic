import { academicApiFetch } from "./client";
import type { ApiHall, ApiSchoolClass, CreateHallPayload } from "./types";

export function listHalls() {
  return academicApiFetch<ApiHall[]>("/halls");
}

export function getHall(id: string) {
  return academicApiFetch<ApiHall>(`/halls/${id}`);
}

export function createHall(payload: CreateHallPayload) {
  return academicApiFetch<ApiHall>("/halls", { method: "POST", body: JSON.stringify(payload) });
}

export function updateHall(id: string, payload: Partial<CreateHallPayload>) {
  return academicApiFetch<ApiHall>(`/halls/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteHall(id: string) {
  return academicApiFetch<{ id: string }>(`/halls/${id}`, { method: "DELETE" });
}
