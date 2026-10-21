import { academicApiFetch } from "./client";
import type {
  ApiSportTimetableEntry,
  ApiTimetableEntry,
  SaveTimetableBatchPayload,
} from "./types";

export function listTimetableForYear(query: { timetableType?: string; examName?: string } = {}) {
  const params = new URLSearchParams();
  if (query.timetableType) params.set("timetableType", query.timetableType);
  if (query.examName) params.set("examName", query.examName);
  return academicApiFetch<ApiTimetableEntry[]>(`/timetable?${params.toString()}`);
}

/** Class-scoped grid — the shape the week editor reads and writes. */
export function listTimetableForClass(classId: string, query: { timetableType?: string; examName?: string } = {}) {
  const params = new URLSearchParams();
  if (query.timetableType) params.set("timetableType", query.timetableType);
  if (query.examName) params.set("examName", query.examName);
  return academicApiFetch<ApiTimetableEntry[]>(`/timetable/class/${classId}?${params.toString()}`);
}

/** Saves the entire visible week for one class in a single request. */
export function saveTimetableBatch(payload: SaveTimetableBatchPayload) {
  return academicApiFetch<ApiTimetableEntry[]>("/timetable/batch", { method: "PUT", body: JSON.stringify(payload) });
}

export function listSportTimetable(classId?: string) {
  const params = new URLSearchParams();
  if (classId) params.set("classId", classId);
  return academicApiFetch<ApiSportTimetableEntry[]>(`/sport-timetable?${params.toString()}`);
}
