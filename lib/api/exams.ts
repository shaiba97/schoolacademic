import { academicApiFetch } from "./client";
import type {
  ApiExam,
  ApiExamAnalytics,
  ApiExamSubject,
  ApiPaginated,
  ApiRoomAssignment,
  CreateExamPayload,
  CreateExamSubjectPayload,
  CreateRoomAssignmentPayload,
  ReorderRoomStudentsPayload,
} from "./types";

export function listExams(query: { yearId?: string; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.yearId) params.set("yearId", query.yearId);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return academicApiFetch<ApiPaginated<ApiExam>>(`/exams?${params.toString()}`);
}

export function getExam(id: string) {
  return academicApiFetch<ApiExam>(`/exams/${id}`);
}

export function createExam(payload: CreateExamPayload) {
  return academicApiFetch<ApiExam | ApiExam[]>("/exams", { method: "POST", body: JSON.stringify(payload) });
}

export function updateExam(id: string, payload: Partial<CreateExamPayload> & { status?: string }) {
  return academicApiFetch<ApiExam>(`/exams/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function addExamSubject(examId: string, payload: CreateExamSubjectPayload) {
  return academicApiFetch<ApiExamSubject>(`/exams/${examId}/subjects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeExamSubject(examId: string, subjectId: string) {
  return academicApiFetch<{ id: string }>(`/exams/${examId}/subjects/${subjectId}`, { method: "DELETE" });
}

export function enterSubjectMarks(examSubjectId: string, records: Array<{ studentId: string; marks: number; remarks?: string }>) {
  return academicApiFetch(`/exams/subjects/${examSubjectId}/marks`, {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export function publishExamResults(examId: string) {
  return academicApiFetch<{ published: boolean }>(`/exams/${examId}/publish`, { method: "POST" });
}

export function getExamAnalytics(examId: string) {
  return academicApiFetch<ApiExamAnalytics>(`/exams/${examId}/analytics`);
}

export function listExamRooms(examId: string) {
  return academicApiFetch<ApiRoomAssignment[]>(`/exams/${examId}/rooms`);
}

export function assignExamRoom(examId: string, payload: CreateRoomAssignmentPayload) {
  return academicApiFetch<ApiRoomAssignment>(`/exams/${examId}/rooms`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRoomInvigilators(examId: string, roomId: string, invigilatorIds: string[]) {
  return academicApiFetch<ApiRoomAssignment>(`/exams/${examId}/rooms/${roomId}/invigilators`, {
    method: "PUT",
    body: JSON.stringify({ invigilatorIds }),
  });
}

export function reorderRoomStudents(examId: string, roomId: string, payload: ReorderRoomStudentsPayload) {
  return academicApiFetch<ApiRoomAssignment>(`/exams/${examId}/rooms/${roomId}/students/order`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function removeExamRoom(examId: string, roomId: string) {
  return academicApiFetch<{ id: string }>(`/exams/${examId}/rooms/${roomId}`, { method: "DELETE" });
}
