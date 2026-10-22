import { academicApiFetch } from "./client";

export type StudentDocumentType = "PROFILE_IMAGE" | "NATIONAL_NUMBER" | "NATIONAL_CARD" | "PASSPORT" | "TRANSFER_RESULT" | "GUARDIAN_ID_PROOF";
export type TeacherDocumentType = "PROFILE_IMAGE" | "ID_PROOF";
export type ExamDocumentType = "EXAM_SAMPLE";

export function uploadStudentFile(input: { file: File; draftId: string; documentType: StudentDocumentType; studentId?: string; fieldId?: string }) {
  const body = new FormData();
  body.append("file", input.file);
  body.append("draftId", input.draftId);
  body.append("documentType", input.documentType);
  if (input.studentId) body.append("studentId", input.studentId);
  if (input.fieldId) body.append("fieldId", input.fieldId);
  return academicApiFetch<{ objectKey: string; originalName: string; contentType: string; size: number }>("/storage/upload", { method: "POST", body });
}

export function uploadTeacherFile(input: { file: File; draftId: string; documentType: TeacherDocumentType }) {
  const body = new FormData();
  body.append("file", input.file);
  body.append("draftId", input.draftId);
  body.append("documentType", input.documentType);
  return academicApiFetch<{ objectKey: string; originalName: string; contentType: string; size: number }>("/storage/upload", { method: "POST", body });
}

export function deleteStagedFile(objectKey: string) {
  return academicApiFetch<{ deleted: true }>("/storage/staging/delete", { method: "POST", body: JSON.stringify({ objectKey }) });
}

/**
 * Stage a named teacher credential. Uses its own document type so the file
 * lands under `teachers/{tenant}/{teacher}/CREDENTIAL/…` once the teacher
 * service commits it, keeping it clear of the fixed avatar/ID-proof slots.
 */
export function uploadTeacherCredentialFile(input: { file: File; draftId: string }) {
  const body = new FormData();
  body.append("file", input.file);
  body.append("draftId", input.draftId);
  body.append("documentType", "CREDENTIAL");
  return academicApiFetch<{ objectKey: string; originalName: string; contentType: string; size: number }>("/storage/upload", { method: "POST", body });
}

/**
 * Downloads ride the same-origin session proxy — the browser cannot set
 * the Authorization / tenant headers on plain anchors and image tags, so
 * every download URL goes through /api/backend, which attaches the
 * session cookie's credentials to the upstream call.
 */
export function getFileDownloadUrl(objectKey: string) {
  return `/api/backend/storage/download?objectKey=${encodeURIComponent(objectKey)}`;
}

export function getStudentFileDownloadUrl(objectKey: string) {
  return getFileDownloadUrl(objectKey);
}

export async function downloadFile(objectKey: string) {
  const response = await fetch(getFileDownloadUrl(objectKey), { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("Unable to download file");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = objectKey.split("/").pop() || "download";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadStudentFile(objectKey: string) {
  return downloadFile(objectKey);
}

/**
 * Fetch a stored object as a blob for inline display (avatars, previews).
 * Plain `<img src>` / anchors cannot send the session headers, so binary
 * content is loaded here (authenticated + tenant-scoped like everything
 * else) and surfaced as an object URL. Callers must revoke the URL.
 *
 * Failures carry the status and byte count: a 200 with an empty or stalled
 * body is otherwise indistinguishable from success to the caller, and shows
 * up as a permanent loading placeholder rather than an error.
 */
export async function fetchFileBlob(objectKey: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(getFileDownloadUrl(objectKey), { cache: "no-store", credentials: "include", signal });
  if (!response.ok) throw new Error(`Unable to load file (status ${response.status})`);
  const blob = await response.blob();
  if (blob.size === 0) throw new Error(`Unable to load file (status ${response.status}, 0 bytes received)`);
  return blob;
}

export function uploadExamSample(input: { file: File; draftId: string }) {
  const body = new FormData();
  body.append("file", input.file);
  body.append("draftId", input.draftId);
  body.append("documentType", "EXAM_SAMPLE");
  return academicApiFetch<{ objectKey: string; originalName: string; contentType: string; size: number }>("/storage/upload", { method: "POST", body });
}

export function getExamSampleDownloadUrl(objectKey: string) {
  return getFileDownloadUrl(objectKey);
}

export async function downloadExamSampleFile(objectKey: string) {
  return downloadFile(objectKey);
}
