import { academicApiFetch } from "./client";
import type { ApiDepartment, CreateDepartmentPayload, UpdateDepartmentPayload } from "./types";

export function listDepartments() {
  return academicApiFetch<ApiDepartment[]>("/departments");
}

export function getDepartment(id: string) {
  return academicApiFetch<ApiDepartment>(`/departments/${id}`);
}

export function createDepartment(payload: CreateDepartmentPayload) {
  return academicApiFetch<ApiDepartment>("/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateDepartment(id: string, payload: UpdateDepartmentPayload) {
  return academicApiFetch<ApiDepartment>(`/departments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteDepartment(id: string) {
  return academicApiFetch<{ success: boolean }>(`/departments/${id}`, { method: "DELETE" });
}
