"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Clock,
  Download,
  Eye,
  Pencil,
  Plus,
  Printer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createStudentGuardian,
  linkStudentGuardian,
  listStudentGuardians,
  removeStudentGuardian,
  searchGuardians,
  updateStudentGuardian,
} from "@/lib/api/students";
import type {
  ApiEnrollment,
  ApiGuardianSummary,
  ApiStudent,
  ApiStudentAttendanceRecord,
  ApiStudentGuardianLink,
  ApiStudentResult,
} from "@/lib/api/types";
import { currentClassLabel, studentFullName } from "@/lib/api/mappers";
import { toTitleCase } from "@/lib/text";
import { academicErrorMessage, formatAcademicDate } from "@/components/academics/academic-utils";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { StudentAvatar } from "@/components/students/student-avatar";
import { studentStatusBadgeVariant, useStudentActions } from "@/components/students/use-student-actions";

function classSummary(student: ApiStudent): string {
  const label = currentClassLabel(student);
  return label === "-" ? "—" : label;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value ?? "—"}
    </p>
  );
}

function visibleResult(result: ApiStudentResult): boolean {
  // Visibility rule (confirmed): Major renders only when PUBLISHED;
  // Casual renders once SUBMITTED or beyond; DRAFT never renders.
  if (result.status === "DRAFT") return false;
  if (result.kind === "CASUAL") return true;
  return result.status === "PUBLISHED";
}

export function StudentDetailClient({
  student: initialStudent,
  error,
  initialGuardians,
  initialResults,
  initialAttendance,
}: {
  student: ApiStudent | null;
  error?: string;
  initialGuardians: ApiStudentGuardianLink[];
  initialResults: ApiStudentResult[];
  initialAttendance: ApiStudentAttendanceRecord[];
}) {
  const router = useRouter();
  const [student, setStudent] = React.useState(initialStudent);
  const [tab, setTab] = React.useState("profile");
  const [bannerError, setBannerError] = React.useState(error ?? "");

  const actions = useStudentActions({
    onChanged: (updated) => setStudent(updated),
    onError: (message) => setBannerError(message),
    onDeleted: () => router.push("/students/all"),
  });

  if (!student) {
    return <EmptyState title="Student not found" description={error || "The student record could not be loaded."} action={{ label: "Back to Students", onClick: () => router.push("/students/all") }} />;
  }

  const enrollments = student.enrollments ?? [];
  const documents = student.documents ?? [];

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" className="px-0" onClick={() => router.push("/students/all")}>
          <ArrowLeft size={14} /> Back to Students
        </Button>
        <div className="mt-3 flex items-start gap-4">
          <StudentAvatar student={student} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{studentFullName(student)}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {student.roleNumber || "—"} · {classSummary(student)} · {student.status || "—"}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <Badge variant={studentStatusBadgeVariant(student.status)}>{student.status}</Badge>
          </div>
        </div>
      </div>

      {bannerError ? (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {bannerError}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="performances">Performances</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab student={student} actions={actions} />
        </TabsContent>
        <TabsContent value="enrollments">
          <EnrollmentsTab enrollments={enrollments} />
        </TabsContent>
        <TabsContent value="guardians">
          <GuardiansTab studentId={student.id} initialLinks={initialGuardians} />
        </TabsContent>
        <TabsContent value="performances">
          <PerformancesTab initialResults={initialResults} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab initialRecords={initialAttendance} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab documents={documents} />
        </TabsContent>
      </Tabs>

      {actions.dialogs}
    </div>
  );
}

function ProfileTab({
  student,
  actions,
}: {
  student: ApiStudent;
  actions: ReturnType<typeof useStudentActions>;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Student Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Role number" value={<span className="font-mono text-xs">{student.roleNumber}</span>} />
            <Info label="Gender" value={student.gender ?? "—"} />
            <Info
              label="Date of birth"
              value={student.dateOfBirth ? formatAcademicDate(student.dateOfBirth) : "—"}
            />
            <Info label="Education level" value={student.educationLevel ?? "—"} />
            <Info label="Grade" value={student.grade ?? "—"} />
            <Info label="Mother" value={student.motherFullname ?? "—"} />
            <Info label="Father" value={student.fatherFullname ?? "—"} />
            <Info label="Joined" value={formatAcademicDate(student.admissionDate ?? student.createdAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Phone" value={student.phone ? <span className="font-mono text-xs">{student.phone}</span> : "—"} />
            <Info label="Address" value={student.address ?? "—"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Admission Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openAdmission(student)}>
            <Eye size={14} /> View
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openAdmission(student)}>
            <Printer size={14} /> Print…
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openAdmission(student)}>
            <Download size={14} /> Download…
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Student Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/students/all/${student.id}/edit`)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openArchive(student)} disabled={actions.actionPending}>
            <Archive size={14} /> Archive
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openStatus(student, "FIRE")}>
            <Trash2 size={14} /> Fire
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.openStatus(student, "POSTPONE")}>
            <Clock size={14} /> Postpone
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.transferTo(student)}>
            <TrendingUp size={14} /> Transfer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => actions.openDelete(student)}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EnrollmentsTab({ enrollments }: { enrollments: ApiEnrollment[] }) {
  if (enrollments.length === 0) {
    return <EmptyState title="No enrollments" description="This student has no enrollment records. Enrollments change via the Transfer and Promotion flows." />;
  }
  const columns: Column<ApiEnrollment>[] = [
    { id: "year", header: "Year", accessor: (enrollment) => enrollment.academicYear?.name ?? "Unknown year", sortable: true },
    { id: "class", header: "Class", accessor: (enrollment) => enrollment.schoolClass?.className ?? "Unknown class" },
    {
      id: "field",
      header: "Field",
      accessor: (enrollment) => enrollment.field
        ? enrollment.field.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ")
        : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "status",
      header: "Status",
      accessor: (enrollment) => <Badge variant={enrollment.status === "ACTIVE" ? "success" : "muted"}>{enrollment.status}</Badge>,
    },
  ];
  return (
    <div className="space-y-3">
      <DataTable
        data={enrollments}
        columns={columns}
        getRowId={(enrollment) => enrollment.id}
        emptyTitle="No enrollments"
        emptyDescription="This student has no enrollment records. Enrollments change via the Transfer and Promotion flows."
      />
      <p className="text-xs text-muted-foreground">Read-only history — enrollment changes happen via the Transfer and Promotion flows, not here.</p>
    </div>
  );
}

const RELATIONSHIP_OPTIONS = ["FATHER", "MOTHER", "BROTHER", "SISTER", "GUARDIAN", "OTHER"];

export function GuardiansTab({ studentId, initialLinks }: { studentId: string; initialLinks: ApiStudentGuardianLink[] }) {
  const [links, setLinks] = React.useState(initialLinks);
  const [error, setError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiStudentGuardianLink | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ApiStudentGuardianLink | null>(null);
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [formMode, setFormMode] = React.useState<"create" | "link">("create");
  const [linkQuery, setLinkQuery] = React.useState("");
  const [linkResults, setLinkResults] = React.useState<ApiGuardianSummary[]>([]);
  const [linkSearching, setLinkSearching] = React.useState(false);
  const [linkSelectedId, setLinkSelectedId] = React.useState("");

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [relationship, setRelationship] = React.useState("FATHER");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [canPickup, setCanPickup] = React.useState(true);
  const [emergencyContact, setEmergencyContact] = React.useState(false);

  function openCreate() {
    setEditing(null);
    setFormMode("create");
    setLinkQuery("");
    setLinkResults([]);
    setLinkSelectedId("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setRelationship("FATHER");
    setIsPrimary(links.length === 0);
    setCanPickup(true);
    setEmergencyContact(false);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(link: ApiStudentGuardianLink) {
    if (pending) return;
    setEditing(link);
    setFirstName(link.guardian.firstName);
    setLastName(link.guardian.lastName ?? "");
    setPhone(link.guardian.phone ?? "");
    setEmail(link.guardian.email ?? "");
    setAddress(link.guardian.address ?? "");
    setRelationship(
      RELATIONSHIP_OPTIONS.includes(link.relationship) ? link.relationship : "OTHER",
    );
    setIsPrimary(link.isPrimary);
    setCanPickup(link.canPickup);
    setEmergencyContact(link.emergencyContact);
    setFormError("");
    setFormOpen(true);
  }

  async function refresh() {
    try {
      setLinks(await listStudentGuardians(studentId));
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to reload guardians"));
    }
  }

  async function handleLinkSearch() {
    const query = linkQuery.trim();
    if (!query || linkSearching) return;
    setLinkSearching(true);
    setFormError("");
    try {
      const linkedIds = new Set(links.map((link) => link.guardianId));
      const results = await searchGuardians(query);
      setLinkResults(results.filter((guardian) => !linkedIds.has(guardian.id)));
      setLinkSelectedId("");
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to search guardians"));
    } finally {
      setLinkSearching(false);
    }
  }

  async function handleLinkSubmit() {
    if (pending || !linkSelectedId) return;
    setPending(true);
    setFormError("");
    try {
      await linkStudentGuardian(studentId, {
        guardianId: linkSelectedId,
        relationship,
        isPrimary,
        canPickup,
        emergencyContact,
      });
      setFormOpen(false);
      setLinkQuery("");
      setLinkResults([]);
      setLinkSelectedId("");
      await refresh();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to link guardian"));
    } finally {
      setPending(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !relationship) return;
    setPending(true);
    setFormError("");
    try {
      if (editing) {
        await updateStudentGuardian(studentId, editing.guardianId, {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          relationship,
          isPrimary,
          canPickup,
          emergencyContact,
        });
      } else {
        await createStudentGuardian(studentId, {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          relationship,
          isPrimary,
          canPickup,
          emergencyContact,
        });
      }
      setFormOpen(false);
      setEditing(null);
      await refresh();
    } catch (cause) {
      setFormError(academicErrorMessage(cause, "Unable to save guardian"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setPending(true);
    setError("");
    try {
      await removeStudentGuardian(studentId, deleteTarget.guardianId);
      setDeleteTarget(null);
      await refresh();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to remove guardian"));
      setDeleteTarget(null);
    } finally {
      setPending(false);
    }
  }

  async function makePrimary(link: ApiStudentGuardianLink) {
    if (link.isPrimary || pending) return;
    setPending(true);
    setError("");
    try {
      await updateStudentGuardian(studentId, link.guardianId, { isPrimary: true });
      await refresh();
    } catch (cause) {
      setError(academicErrorMessage(cause, "Unable to set primary contact"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {links.length === 0
            ? "No guardians on file."
            : "One guardian is the primary contact for notifications."}
        </p>
          <Button type="button" size="sm" onClick={openCreate} disabled={pending}>
            <Plus size={14} /> Add Guardian
          </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {links.length === 0 ? (
        <EmptyState
          title="No guardians linked"
          description="Add the father, mother, or another guardian. The first guardian added becomes the primary contact."
          action={{ label: "Add Guardian", onClick: openCreate }}
        />
      ) : (
        <GuardiansTable
          links={links}
          pending={pending}
          onMakePrimary={(link) => void makePrimary(link)}
          onEdit={openEdit}
          onDelete={(link) => {
            if (!pending) setDeleteTarget(link);
          }}
        />
      )}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!pending) { setFormOpen(open); if (!open) setEditing(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit guardian" : formMode === "link" ? "Link existing guardian" : "Add guardian"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update contact details and link flags. Contact changes update this guardian everywhere they are listed."
                : formMode === "link"
                  ? "Find a guardian already on file and link them to this student."
                  : "Create a guardian record and link it to this student."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!editing && formMode === "link") void handleLinkSubmit();
              else void handleSave(event);
            }}
          >
            {!editing ? (
              <div className="flex gap-1.5 rounded-lg bg-muted p-1" role="tablist" aria-label="Guardian entry mode">
                {(["link", "create"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={formMode === mode}
                    onClick={() => {
                      setFormMode(mode);
                      setFormError("");
                    }}
                    disabled={pending}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${formMode === mode ? "border bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {mode === "link" ? "Link existing" : "Create new"}
                  </button>
                ))}
              </div>
            ) : null}
            {!editing && formMode === "link" ? (
              <div className="space-y-2">
                <label htmlFor="guardian-search" className="text-sm font-medium">Search by name or phone</label>
                <div className="flex gap-2">
                  <Input
                    id="guardian-search"
                    value={linkQuery}
                    onChange={(event) => setLinkQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleLinkSearch();
                      }
                    }}
                    placeholder="Amina or +249…"
                    disabled={pending}
                  />
                  <Button type="button" variant="outline" onClick={() => void handleLinkSearch()} disabled={pending || linkSearching || !linkQuery.trim()}>
                    {linkSearching ? "Searching…" : "Search"}
                  </Button>
                </div>
                {linkResults.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1" role="radiogroup" aria-label="Matching guardians">
                    {linkResults.map((guardian) => (
                      <label
                        key={guardian.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 ${linkSelectedId === guardian.id ? "bg-accent/60" : ""}`}
                      >
                        <input
                          type="radio"
                          name="link-guardian"
                          checked={linkSelectedId === guardian.id}
                          onChange={() => setLinkSelectedId(guardian.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {toTitleCase(`${guardian.firstName} ${guardian.lastName ?? ""}`.trim())}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[guardian.phone, `${guardian._count.students} linked student${guardian._count.students === 1 ? "" : "s"}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="guardian-first" className="text-sm font-medium">First name *</label>
                <Input id="guardian-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="guardian-last" className="text-sm font-medium">Last name</label>
                <Input id="guardian-last" value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="guardian-phone" className="text-sm font-medium">Phone</label>
                <Input id="guardian-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+249 …" />
              </div>
              <div className="space-y-2">
                <label htmlFor="guardian-email" className="text-sm font-medium">Email</label>
                <Input id="guardian-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="guardian-address" className="text-sm font-medium">Address</label>
                <Input id="guardian-address" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
            </div>
            )}
            {editing ? (
              <p className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                Editing this guardian&apos;s contact details updates them everywhere they are listed.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="guardian-rel" className="text-sm font-medium">Relationship *</label>
                <select
                  id="guardian-rel"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="FATHER">Father</option>
                  <option value="MOTHER">Mother</option>
                  <option value="OTHER">Other</option>
                  {!RELATIONSHIP_OPTIONS.includes(relationship) ? (
                    <option value={relationship}>{relationship} (stored)</option>
                  ) : null}
                </select>
                <p className="text-xs text-muted-foreground">Stored values outside the list are preserved, not rewritten.</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Flags</span>
                <div className="flex flex-col gap-1.5 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} className="size-4 accent-primary" />
                    Primary contact
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={canPickup} onChange={(event) => setCanPickup(event.target.checked)} className="size-4 accent-primary" />
                    Can pick up
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={emergencyContact} onChange={(event) => setEmergencyContact(event.target.checked)} className="size-4 accent-primary" />
                    Emergency contact
                  </label>
                </div>
              </div>
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || (!editing && formMode === "link" ? !linkSelectedId : !firstName.trim())}
              >
                {pending ? "Saving…" : editing ? "Save changes" : formMode === "link" ? "Link guardian" : "Add guardian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from this student?</AlertDialogTitle>
            <AlertDialogDescription>
              Only this student&apos;s link to the guardian will be removed. The guardian record itself is deleted only when no other student links to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (!pending) setDeleteTarget(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {pending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type GuardianRow = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  primary: boolean;
  link: ApiStudentGuardianLink;
};

function GuardiansTable({
  links,
  pending,
  onMakePrimary,
  onEdit,
  onDelete,
}: {
  links: ApiStudentGuardianLink[];
  pending: boolean;
  onMakePrimary: (link: ApiStudentGuardianLink) => void;
  onEdit: (link: ApiStudentGuardianLink) => void;
  onDelete: (link: ApiStudentGuardianLink) => void;
}) {
  const rows: GuardianRow[] = links.map((link) => ({
    id: link.guardianId,
    name: toTitleCase(`${link.guardian.firstName} ${link.guardian.lastName ?? ""}`),
    relationship: link.relationship,
    phone: link.guardian.phone ?? "—",
    primary: link.isPrimary,
    link,
  }));
  const columns: Column<GuardianRow>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (row) => (
        <span>
          <span className="block font-medium">{row.name}</span>
          {row.link.siblingStudents && row.link.siblingStudents.length > 0 ? (
            <span className="block text-xs font-normal text-muted-foreground">
              Also guardian of: {row.link.siblingStudents.map((sibling) => toTitleCase(`${sibling.firstName} ${sibling.lastName ?? ""}`.trim())).join(", ")}
            </span>
          ) : null}
        </span>
      ),
      sortable: true,
    },
    { id: "relationship", header: "Relationship", accessor: (row) => row.relationship },
    { id: "guardianNumber", header: "Guardian ID", accessor: (row) => <span className="font-mono text-xs">{row.link.guardian.guardianNumber ?? "—"}</span> },
    { id: "phone", header: "Phone", accessor: (row) => <span className="font-mono text-xs">{row.phone}</span> },
    {
      id: "primary",
      header: "Primary",
      accessor: (row) => (row.primary ? <Badge variant="secondary">Primary</Badge> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "actions",
      header: "",
      accessor: (row) => (
        <span className="flex items-center justify-end gap-1">
          {!row.primary ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onMakePrimary(row.link)} disabled={pending}>
              Set primary
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(row.link)} disabled={pending} aria-label={`Edit ${row.name}`}>
            <Pencil size={14} aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(row.link)} disabled={pending} aria-label={`Remove ${row.name} from this student`}>
            <Trash2 size={14} aria-hidden />
          </Button>
        </span>
      ),
    },
  ];
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      emptyTitle="No guardians linked"
      emptyDescription="Add the father, mother, or another guardian. The first guardian added becomes the primary contact."
    />
  );
}

function PerformancesTab({ initialResults }: { initialResults: ApiStudentResult[] }) {
  const [selected, setSelected] = React.useState<ApiStudentResult | null>(null);

  const visible = React.useMemo(
    () => initialResults.filter(visibleResult),
    [initialResults],
  );

  function scoreLabel(result: ApiStudentResult) {
    if (result.marks == null) return "Absent";
    return String(result.marks);
  }

  return (
    <div className="space-y-4">
      {initialResults.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Exam results appear here once published (major exams) or submitted (casual quizzes)."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No visible results"
          description="Results exist but none are published yet. Drafts never show here."
        />
      ) : (
        <div className="space-y-2">
          {visible.map((result) => (
            <div key={result.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {result.examSubject?.exam?.name ?? "Exam"}
                  {" · "}
                  {result.examSubject?.classSubject?.subject?.name ?? "Subject"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.createdAt ? formatAcademicDate(result.createdAt) : ""}
                  {result.grade ? ` · Grade ${result.grade}` : ""}
                </p>
              </div>
              <Badge variant={result.kind === "CASUAL" ? "secondary" : "outline"}>
                {result.kind === "CASUAL" ? "Casual" : "Major"}
              </Badge>
              <Badge variant="outline">
                {scoreLabel(result)}{result.marks != null ? ` / ${String(result.examSubject?.maxMarks ?? "?")}` : ""}
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(result)}>
                <Eye size={14} /> View
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Result</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.examSubject?.exam?.name ?? "Exam"} · ${selected.examSubject?.classSubject?.subject?.name ?? "Subject"}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Type</dt><dd>{selected.kind === "CASUAL" ? "Casual" : "Major"}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Score</dt><dd className="font-medium">{scoreLabel(selected)}{selected.marks != null ? ` / ${String(selected.examSubject?.maxMarks ?? "?")}` : ""}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Grade</dt><dd>{selected.grade ?? "—"}</dd></div>
              <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Status</dt><dd>{selected.status}</dd></div>
              {selected.remarks ? (
                <div className="flex gap-2"><dt className="text-muted-foreground w-28 shrink-0">Remarks</dt><dd>{selected.remarks}</dd></div>
              ) : null}
            </dl>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Download size={14} /> Download PDF
            </Button>
          </DialogFooter>
          <p className="text-xs text-muted-foreground">Download opens the print dialog — choose “Save as PDF”.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function AttendanceTab({ initialRecords }: { initialRecords: ApiStudentAttendanceRecord[] }) {
  const [monthOffset, setMonthOffset] = React.useState(0);

  const base = new Date();
  const cursor = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Attendance rule (documented, not incidental): PRESENT + LATE count as
  // attended; EXCUSED sessions are excluded from the rate denominator;
  // unknown statuses count toward the total but not toward attended.
  // Multi-session days collapse to the worst severity for the cell color,
  // with the session count shown in the tooltip.
  const SEVERITY = ["ABSENT", "LATE", "EXCUSED", "PRESENT"] as const;

  const byDay = React.useMemo(() => {
    const map = new Map<string, { status: string; count: number }>();
    for (const record of initialRecords) {
      const day = (record.attendanceSession?.attendanceDate ?? "").slice(0, 10);
      if (!day.startsWith(monthKey)) continue;
      const prev = map.get(day);
      if (!prev) {
        map.set(day, { status: record.status, count: 1 });
        continue;
      }
      const rank = (s: string) => {
        const i = (SEVERITY as readonly string[]).indexOf(s);
        return i === -1 ? SEVERITY.length : i;
      };
      map.set(day, {
        status: rank(record.status) < rank(prev.status) ? record.status : prev.status,
        count: prev.count + 1,
      });
    }
    return map;
  }, [initialRecords, monthKey]);

  const summary = React.useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let other = 0;
    for (const record of initialRecords) {
      if (record.status === "PRESENT") present++;
      else if (record.status === "ABSENT") absent++;
      else if (record.status === "LATE") late++;
      else if (record.status === "EXCUSED") excused++;
      else other++;
    }
    const total = present + absent + late + excused + other;
    const denominator = total - excused;
    return {
      total,
      present,
      absent,
      late,
      excused,
      percentage: denominator > 0 ? Math.round(((present + late) / denominator) * 100) : 0,
    };
  }, [initialRecords]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; date: string; status?: string; count?: number }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, date: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    const entry = byDay.get(date);
    cells.push({ day: d, date, status: entry?.status, count: entry?.count });
  }

  const cellRefs = React.useRef<Array<HTMLSpanElement | null>>([]);

  function focusCell(index: number) {
    const count = cells.length;
    let i = ((index % count) + count) % count;
    for (let step = 0; step < count; step++) {
      const el = cellRefs.current[i];
      const cell = cells[i];
      if (el && cell.day !== null) {
        el.focus();
        return;
      }
      i = (i + 1) % count;
    }
  }

  function onCellKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(index + 7);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(index - 7);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusCell(cells.findIndex((c) => c.day !== null));
    } else if (event.key === "End") {
      event.preventDefault();
      focusCell(cells.length - 1);
    }
  }

  function dayClass(status?: string) {
    switch (status) {
      case "PRESENT":
        return "bg-success/15 text-success border-success/30";
      case "ABSENT":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "LATE":
        return "bg-warning/15 text-warning border-warning/30";
      case "EXCUSED":
        return "bg-info/15 text-info border-info/30";
      default:
        return "bg-muted/50 text-muted-foreground border-transparent";
    }
  }

  const monthName = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{summary.percentage}%</p><p className="text-xs text-muted-foreground">Attendance rate</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{summary.absent}</p><p className="text-xs text-muted-foreground">Days absent</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{summary.late}</p><p className="text-xs text-muted-foreground">Days late</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-semibold">{summary.total}</p><p className="text-xs text-muted-foreground">Sessions recorded</p></CardContent></Card>
      </div>

      {initialRecords.length === 0 ? (
        <EmptyState title="No attendance yet" description="Attendance appears here once sessions are marked for this student's classes." />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{monthName}</CardTitle>
              <div className="flex gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
                  ← Prev
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setMonthOffset(0)}>
                  Today
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>
                  Next →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Attendance for ${monthName}`}>
              {DAY_LABELS.map((label) => (
                <span key={label} className="text-xs font-medium text-muted-foreground py-1">{label}</span>
              ))}
              {cells.map((cell, i) =>
                cell.day === null ? (
                  <span key={`blank-${i}`} />
                ) : (
                  <span
                    key={cell.date}
                    ref={(el) => {
                      cellRefs.current[i] = el;
                    }}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${cell.date}${cell.status ? `: ${cell.status}` : ""}${cell.count && cell.count > 1 ? ` (${cell.count} sessions)` : ""}`}
                    title={cell.status ? `${cell.status}${cell.count && cell.count > 1 ? ` × ${cell.count}` : ""}` : "No session"}
                    onKeyDown={(event) => onCellKeyDown(event, i)}
                    className={`inline-flex size-8 items-center justify-center rounded-lg border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dayClass(cell.status)}`}
                  >
                    {cell.day}
                  </span>
                ),
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-success/60" /> Present</span>
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-destructive/60" /> Absent</span>
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-warning/60" /> Late</span>
              <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-info/60" /> Excused</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const DOC_SLOTS: Array<{ type: string; title: string; required: boolean }> = [
  { type: "PROFILE_IMAGE", title: "Profile image", required: false },
  { type: "NATIONAL_NUMBER", title: "National number", required: true },
  { type: "NATIONAL_CARD", title: "National card", required: true },
  { type: "PASSPORT", title: "Passport", required: false },
];

function DocumentsTab({ documents }: { documents: NonNullable<ApiStudent["documents"]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DOC_SLOTS.map((slot) => {
        const doc = documents.find((d) => d.documentType === slot.type);
        if (!doc) {
          return (
            <Card key={slot.type}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {slot.required ? "Required — not provided" : "Not provided"}
                </p>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card key={slot.type}>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-sm font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
              </div>
              <DocumentViewer document={doc} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
