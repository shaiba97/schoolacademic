import { academicApiFetch } from "./client";
import type { ApiAdmissionResponse, ApiEnrollmentRecord, ApiGuardianSummary, ApiPaginated, ApiReferenceData, ApiStudent, ApiStudentAttendanceRecord, ApiStudentGuardianLink, ApiStudentResult, CreateAdmissionPayload, CreateStudentPayload, StudentListQuery, UpdateStudentPayload } from "./types";

export function listStudents(query: StudentListQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.classId) params.set("classId", query.classId);
  if (query.academicYearId) params.set("academicYearId", query.academicYearId);
  if (query.educationLevel) params.set("educationLevel", query.educationLevel);
  if (query.grade !== undefined) params.set("grade", String(query.grade));
  return academicApiFetch<ApiPaginated<ApiStudent>>(`/students?${params.toString()}`);
}

export function getStudent(id: string) {
  return academicApiFetch<ApiStudent>(`/students/${id}`);
}

export function getStudentReferenceData() {
  return academicApiFetch<ApiReferenceData>("/students/reference-data");
}

export function listEnrollments() {
  return academicApiFetch<ApiEnrollmentRecord[]>("/students/enrollments");
}

export function listGuardians() {
  return academicApiFetch<ApiGuardianSummary[]>("/students/guardians");
}

export function searchGuardians(query: string) {
  return academicApiFetch<ApiGuardianSummary[]>(`/students/guardians/search?q=${encodeURIComponent(query)}`);
}

export function getGuardian(id: string) {
  return academicApiFetch<ApiGuardianSummary & { students: Array<{ relationship: string; student: { id: string; firstName: string; lastName?: string | null; roleNumber?: string | null; status: string } }> }>(`/students/guardians/${id}`);
}

export function createStudent(payload: CreateStudentPayload) {
  return academicApiFetch<ApiStudent>("/students", { method: "POST", body: JSON.stringify(payload) });
}

export function createAdmission(payload: CreateAdmissionPayload) {
  return academicApiFetch<ApiAdmissionResponse>("/students/admissions", { method: "POST", body: JSON.stringify(payload) });
}

export function updateStudent(id: string, payload: UpdateStudentPayload) {
  return academicApiFetch<ApiStudent>(`/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function archiveStudent(id: string) {
  return updateStudent(id, { status: "WITHDRAWN" });
}

export function transferStudent(id: string, classId: string) {
  return academicApiFetch<ApiEnrollmentRecord>(`/students/${id}/transfer`, { method: "POST", body: JSON.stringify({ classId }) });
}

export function enrollStudent(id: string, payload: { academicYearId: string; classId: string; field?: string }) {
  return academicApiFetch<ApiEnrollmentRecord>(`/students/${id}/enrollments`, { method: "POST", body: JSON.stringify(payload) });
}

export function graduateStudent(id: string) {
  return academicApiFetch<ApiStudent>(`/students/${id}/graduate`, { method: "POST" });
}

export function deleteStudent(id: string) {
  return academicApiFetch<{ deleted: true }>(`/students/${id}?confirm=true`, { method: "DELETE" });
}

export function updateStudentStatus(id: string, payload: { status: string; reason?: string }) {
  return academicApiFetch<ApiStudent>(`/students/${id}/status`, { method: "PUT", body: JSON.stringify(payload) });
}

export function listStudentGuardians(studentId: string) {
  return academicApiFetch<ApiStudentGuardianLink[]>(`/students/${studentId}/guardians`);
}

export function createStudentGuardian(
  studentId: string,
  payload: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    relationship: string;
    isPrimary?: boolean;
    canPickup?: boolean;
    emergencyContact?: boolean;
  },
) {
  return academicApiFetch<ApiStudentGuardianLink>(`/students/${studentId}/guardians/new`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function linkStudentGuardian(
  studentId: string,
  payload: {
    guardianId: string;
    relationship: string;
    isPrimary?: boolean;
    canPickup?: boolean;
    emergencyContact?: boolean;
  },
) {
  return academicApiFetch<ApiStudentGuardianLink>(`/students/${studentId}/guardians`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStudentGuardian(
  studentId: string,
  guardianId: string,
  payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    relationship?: string;
    isPrimary?: boolean;
    canPickup?: boolean;
    emergencyContact?: boolean;
  },
) {
  return academicApiFetch<ApiStudentGuardianLink>(`/students/${studentId}/guardians/${guardianId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeStudentGuardian(studentId: string, guardianId: string) {
  return academicApiFetch<{ deleted: true }>(`/students/${studentId}/guardians/${guardianId}/remove`, {
    method: "DELETE",
  });
}

export function listStudentResults(studentId: string) {
  return academicApiFetch<ApiStudentResult[]>(`/students/${studentId}/results`);
}

export function listStudentAttendanceRecords(studentId: string) {
  return academicApiFetch<ApiStudentAttendanceRecord[]>(`/students/${studentId}/attendance-records`);
}
