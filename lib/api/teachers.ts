import { academicApiFetch } from "./client";
import { toTitleCase } from "@/lib/text";
import type {
  ApiDepartment,
  ApiPaginated,
  ApiTeacher,
  ApiTeacherCredential,
  ApiTeacherDocument,
  CreateTeacherCredentialPayload,
  CreateTeacherPayload,
  TeacherQuery,
  UpdateTeacherCredentialPayload,
  UpdateTeacherPayload,
} from "./types";

export type TeacherFromApi = ApiTeacher & { documents: ApiTeacherDocument[] };

export function listTeachers(query: TeacherQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  return academicApiFetch<ApiPaginated<ApiTeacher>>(`/teachers?${params.toString()}`);
}

export function getTeacher(id: string) {
  return academicApiFetch<ApiTeacher>(`/teachers/${id}`);
}

/**
 * The employee number the next teacher would be assigned for a department.
 * Advisory: the value is not reserved, so a concurrent create can shift it.
 */
export function getNextTeacherEmployeeNumber(departmentId?: string) {
  const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : "";
  return academicApiFetch<{ employeeNumber: string }>(`/teachers/next-employee-number${query}`);
}

export function createTeacher(payload: CreateTeacherPayload) {
  return academicApiFetch<ApiTeacher>("/teachers", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTeacher(id: string, payload: UpdateTeacherPayload) {
  return academicApiFetch<ApiTeacher>(`/teachers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function updateTeacherStatus(id: string, status: string) {
  return academicApiFetch<{ id: string; status: string }>(`/teachers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Permanently removes a teacher. The API refuses with 409 when the teacher
 * still heads sections, teaches subjects, or has attendance/duty history —
 * deactivate those cases instead.
 */
export function deleteTeacher(id: string) {
  return academicApiFetch<{ deleted: true; id: string }>(`/teachers/${id}`, { method: "DELETE" });
}

export function listTeacherCredentials(teacherId: string) {
  return academicApiFetch<ApiTeacherCredential[]>(`/teachers/${teacherId}/credentials`);
}

export function addTeacherCredential(teacherId: string, payload: CreateTeacherCredentialPayload) {
  return academicApiFetch<ApiTeacherCredential>(`/teachers/${teacherId}/credentials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTeacherCredential(
  teacherId: string,
  credentialId: string,
  payload: UpdateTeacherCredentialPayload,
) {
  return academicApiFetch<ApiTeacherCredential>(
    `/teachers/${teacherId}/credentials/${credentialId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function deleteTeacherCredential(teacherId: string, credentialId: string) {
  return academicApiFetch<{ deleted: true; id: string }>(
    `/teachers/${teacherId}/credentials/${credentialId}`,
    { method: "DELETE" },
  );
}

export function profileImageDocument(teacher: ApiTeacher) {
  return teacher.documents?.find((document) => document.documentType === "PROFILE_IMAGE") ?? null;
}

export function idProofDocument(teacher: ApiTeacher) {
  return teacher.documents?.find((document) => document.documentType === "ID_PROOF") ?? null;
}

export function deptName(teacher: ApiTeacher, departments: ApiDepartment[]) {
  return teacher.department?.name ?? departments.find((department) => department.id === teacher.departmentId)?.name ?? "Unassigned";
}

export function fullName(teacher: ApiTeacher) {
  const firstName = toTitleCase(teacher.user?.firstName ?? "");
  const lastName = toTitleCase(teacher.user?.lastName ?? "");
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Unnamed teacher";
}