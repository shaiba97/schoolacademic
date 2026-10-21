import { academicApiFetch } from "./client";
import type { ApiGradingBand, ApiGradingScale } from "./types";

export type CreateGradingScalePayload = {
  name: string;
  isDefault?: boolean;
  bands: Array<{
    minPercent: number;
    maxPercent: number;
    grade: string;
    points?: number;
    remark?: string;
  }>;
};

export function listGradingScales() {
  return academicApiFetch<ApiGradingScale[]>("/grading/scales");
}

export function getGradingScale(id: string) {
  return academicApiFetch<ApiGradingScale>(`/grading/scales/${id}`);
}

export function createGradingScale(payload: CreateGradingScalePayload) {
  return academicApiFetch<ApiGradingScale>("/grading/scales", { method: "POST", body: JSON.stringify(payload) });
}

export function updateGradingScale(id: string, payload: Partial<CreateGradingScalePayload>) {
  return academicApiFetch<ApiGradingScale>(`/grading/scales/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteGradingScale(id: string) {
  return academicApiFetch<{ deleted: boolean }>(`/grading/scales/${id}`, { method: "DELETE" });
}

export function bandLabel(band: ApiGradingBand) {
  return `${band.minPercent}–${band.maxPercent}% → ${band.grade}`;
}
