import { academicApiFetch } from "@/lib/api/client";
import { listAcademicYears } from "@/lib/api/academic-years";

export interface StaffProfileTenant {
  id: string;
  name: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  staffNumber: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  position: string;
  positionTitle: string;
  roles: string[];
  tenant: StaffProfileTenant;
}

export async function getStaffProfile(): Promise<StaffProfile> {
  return academicApiFetch<StaffProfile>("/staff/me/profile");
}

export interface AuthMeResponse {
  accessToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    avatarUrl: string | null;
    status: string;
  };
}

/**
 * The server answers with the whole session (token, user, memberships) and
 * does not echo the phone, so the caller re-reads the profile to see it.
 */
export function updateOwnDetails(input: {
  firstName: string;
  lastName?: string;
  phone?: string | null;
}) {
  return academicApiFetch<AuthMeResponse>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getCurrentAcademicYear() {
  const years = await listAcademicYears({ limit: 25 });
  const current = (years.data ?? []).find((year) => year.isCurrent) ?? null;
  if (current) return current;
  // The school may not have flagged a current year yet; fall back to the
  // most recently started one so the card never lies about what runs today.
  const byStart = [...(years.data ?? [])].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  return byStart[0] ?? null;
}
