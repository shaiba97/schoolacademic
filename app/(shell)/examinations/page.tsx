import Link from "next/link";
import {
  ClipboardList,
  Ticket,
  PenLine,
  DoorOpen,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const SECTIONS = [
  { href: "/examinations/exam-setup", icon: ClipboardList, title: "Exams", description: "Types, exams, subjects, and grading scales." },
  { href: "/examinations/hall-tickets", icon: Ticket, title: "Room Tickets", description: "Generate tickets for seated students." },
  { href: "/examinations/marks-results", icon: PenLine, title: "Marks & Results", description: "Entry, processing, and publishing." },
  { href: "/examinations/rooms", icon: DoorOpen, title: "Rooms", description: "Hall registry and room assignments." },
  { href: "/examinations/analytics", icon: BarChart3, title: "Analytics", description: "Read-only performance reports." },
];

export default function ExaminationsHubPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Examination Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exams → Rooms → Room Tickets → Marks & Results → Analytics. Assigning the first
          room locks the exam structure; publishing releases the results.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <section.icon size={16} className="text-muted-foreground" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-primary">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
