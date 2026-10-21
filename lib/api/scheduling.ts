import { academicApiFetch } from "./client";
import type { ApiInvigilationDuty, ApiSeatAssignment, ApiTimetableSlot } from "./types";

export type CreateSlotPayload = {
  examSubjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  hallId?: string;
};

export function listExamSlots(examId: string) {
  return academicApiFetch<ApiTimetableSlot[]>(`/exams/${examId}/slots`);
}

export function createSlot(examId: string, payload: CreateSlotPayload) {
  return academicApiFetch<ApiTimetableSlot>(`/exams/${examId}/slots`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSlot(
  slotId: string,
  payload: Omit<Partial<CreateSlotPayload>, "hallId"> & { hallId?: string | null },
) {
  return academicApiFetch<ApiTimetableSlot>(`/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSlot(slotId: string) {
  return academicApiFetch<{ id: string }>(`/slots/${slotId}`, { method: "DELETE" });
}

export function listSlotSeats(slotId: string) {
  return academicApiFetch<ApiSeatAssignment[]>(`/slots/${slotId}/seats`);
}

export function setSlotSeats(slotId: string, payload: { hallId: string; studentIds: string[] }) {
  return academicApiFetch<ApiSeatAssignment[]>(`/slots/${slotId}/seats`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function assignDuty(slotId: string, payload: { teacherId: string; hallId: string }) {
  return academicApiFetch<ApiInvigilationDuty>(`/slots/${slotId}/duties`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeDuty(dutyId: string) {
  return academicApiFetch<{ id: string }>(`/duties/${dutyId}`, { method: "DELETE" });
}

export function slotsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string },
): boolean {
  const dayA = a.date.slice(0, 10);
  const dayB = b.date.slice(0, 10);
  if (dayA !== dayB) return false;
  return a.startTime < b.endTime && b.startTime < a.endTime;
}
