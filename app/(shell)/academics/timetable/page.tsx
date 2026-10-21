import { TimetableClient } from "@/components/academics/timetable-client";

const allowedTabs = new Set(["class", "teacher", "sport"]);

export default async function TimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = (tab && allowedTabs.has(tab) ? tab : "class") as "class" | "teacher" | "sport";

  return <TimetableClient initialTab={initialTab} />;
}
