"use client";

// Mock file handling for admission draft per spec §3
// — staged in draft/temp location tied to in-progress admission
// — finalized (moved/associated) only on final wizard submit
// — fake delay + fake URL/path so UI demoable without backend

export type DraftFile = { path: string; url: string; name: string; size: number; type: string };

const draftMap = new Map<string, Map<string, DraftFile>>(); // tempId -> fieldId -> file

function fakePath(fieldId: string, file: File): string {
  return `tmp/admissions/draft-${Date.now()}/${fieldId}/${file.name}`;
}

export async function stageDraftFile(tempId: string, fieldId: string, file: File): Promise<DraftFile> {
  // simulate upload delay
  await new Promise((r) => setTimeout(r, 600));
  const path = fakePath(fieldId, file);
  const url = URL.createObjectURL(file);
  const entry: DraftFile = { path, url, name: file.name, size: file.size, type: file.type };
  if (!draftMap.has(tempId)) draftMap.set(tempId, new Map());
  draftMap.get(tempId)!.set(fieldId, entry);
  return entry;
}

export function removeDraftFile(tempId: string, fieldId: string) {
  const m = draftMap.get(tempId);
  if (m) {
    const f = m.get(fieldId);
    if (f?.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
    m.delete(fieldId);
  }
}

export async function finalizeDraft(tempId: string, admissionId: string): Promise<Record<string, string>> {
  const m = draftMap.get(tempId);
  if (!m) return {};
  await new Promise((r) => setTimeout(r, 400));
  const result: Record<string, string> = {};
  for (const [fieldId, f] of m.entries()) {
    // simulate move from tmp → final
    const finalPath = `students/${admissionId}/${fieldId}/${f.name}`;
    result[fieldId] = finalPath;
    if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
  }
  draftMap.delete(tempId);
  return result;
}

export function clearDraft(tempId: string) {
  const m = draftMap.get(tempId);
  if (m) {
    for (const f of m.values()) if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
    draftMap.delete(tempId);
  }
}

export function getDraftFiles(tempId: string): Record<string, DraftFile> {
  const m = draftMap.get(tempId);
  if (!m) return {};
  const out: Record<string, DraftFile> = {};
  for (const [k, v] of m.entries()) out[k] = v;
  return out;
}
