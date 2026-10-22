# DECISIONS — school/academic (Academic Affairs)

Log non-obvious choices here instead of silently diverging from spec §1-8.

## 2026-09-22 — Foundation (T0)
- **Stack lock:** Next.js 16.3.5 + Tailwind 4 + lucide-react 1.47 tree-shakable imports only. No radix/headless additions. Reuse `components/ui/button.tsx` BaseUI primitive.
- **lib/utils.ts:** Replaced `export {cn} from "cn"` with `clsx + tailwind-merge` implementation. `cn` package retained but unused. `button.tsx` import corrected to `@/lib/utils`.
- **Data mode:** `NEXT_PUBLIC_DATA_MODE=mock` (default). All §6 repositories ship as `interface + Mock*Repository`. `Remote*Repository` stubs prepared for Nest wiring (Phase 11). No UI rewrite on swap.
- **Base path:** App Router base is `/` (not `/academic-affairs`). Flutter sitemap's `/academic-affairs/*` collapsed to `/students/*` etc. to avoid double nesting with `app/layout.tsx`. Deep links remain real routes per §4.
- **Admission/Transfer/Promotion:** Prisma has `Student`, `StudentEnrollment`, `StudentStatus`, no dedicated `Admission`/`Transfer` tables. Mock models `AdmissionRecord`, `TransferRequest`, `PromotionDecision` as thin lifecycle objects over `Student + Enrollment + AuditLog`. API will later be `POST /students/:id/enrollments`, `POST /students/:id/transfers`, `POST /promotion/decisions` — mock mirrors that shape.

## 2026-09-22 — Navigation (T1)
- **Primary sidebar:** 9 items in spec order §1 with Lucide icons: `LayoutDashboard/Users/GraduationCap/CalendarCheck/FileText/Clock/TrendingUp/BarChart3/Files`.
- **Second level:** Expanded window → persistent secondary sidebar (subordinate); compact/medium → horizontal scrollable tabs + secondary rail — built in `components/layout/secondary-nav.tsx` reusing Tailwind tokens `app/globals.css:7`.
- **Mock store:** `lib/mock/*` singleton with `localStorage` write-through (key `academic_mock_v1`) so demo mutations survive refresh; fallback to seed if empty. Sharing: `students/graduations` and `promotion/graduation` call one `lib/api/promotion.ts` service.

## 2026-09-22 — Admission Personal Step (6 files + transfer)
- **Confirmed file-only:** `national number (file)` is scan only (no text field), `national card` is distinct ID card scan (not merged) per your go-ahead 2026-09-22 list. Kept 4 file fields + 2 conditional as requested: `profile image` JPG/PNG 5MB, `national number` image/PDF 10MB, `national card` image/PDF 10MB, `passport` image/PDF 10MB optional.
- **Model:** Added `EducationLevel` enum `lib/mock/types.ts:7` (`SECONDARY` default, extensible), normalized `Gender` to 4 values (`PREFER_NOT_TO_SAY`) to match `backend/prisma/schema.prisma:64`, added `AdmissionDraft` with `isFullTime`, `educationLevel`, `profileImagePath` etc., `password` masked via `redactedAdmissionToString` and console `***redacted***` in `admissions/page.tsx:54`.
- **File handling:** New `components/ui/file-picker.tsx:1` (accept, maxSize, preview, remove/replace, drag-over, thumbnail, `border-dashed`, `aria-invalid`) + `lib/mock/file-store.ts:1` draft `tmp/admissions/<tempId>/` staged 600ms fake, finalized on wizard final submit (`finalizeDraft` moves `tmp → students/<id>/`) so abandoned leaves no orphan committed files; mock uses `URL.createObjectURL` for preview. Reuses future `storage` module for final move per §3.
- **Transfer block:** Single `Switch` `isTransferred` `components/ui/switch.tsx:1` above block, animated `grid-rows-[0fr→1fr] overflow-hidden` `admission-personal-step.tsx:185`, clears `formerSchoolName + transferResultFile` on hide so stale never submits.
- **Validation:** Step `isValid` signal via `PersonalStepHandle` `admission-personal-step.tsx:32` — `Next` disabled until all visible required valid per `stepper.tsx:40`. Inline `onBlur` errors, `admissionNumber` regex `^[A-Za-z0-9-]+$` + tenant-unique check against `store.students`, `password` min 8 + strength bar, `dateOfBirth` past + 4-30y soft flag, file type/size helpers under each picker. Transfer pair required only when toggled.
- **UI:** Two `SectionHeader`s via `Card` `card.tsx:4` `"Personal Information"` + conditional `"Transfer Information"`, grid `gap-4 sm:grid-cols-2` responsive single→2-col, `Label htmlFor`→`Input id` a11y, `Switch`, `Select` for enums, `FilePicker` for docs, `Eye/EyeOff size 16` password toggle, `Badge` success/warning for eligibility. Self-contained widget `AdmissionPersonalStep` exposing `isValid/getValues` per Wizard pattern §5.

## 2026-09-23 — Classes (Academic → Classes)
- **Model choice:** Single flexible `SchoolClass` type `lib/mock/types.ts:23` `{ educationLevel:EducationLevel, grade:SchoolClassGrade, track?:Track|null, className, name, code, sequenceNo, createdAt, updatedAt }` + `zod superRefine` `components/academics/class-form.tsx:1` (not discriminated union). Picked flexible + `superRefine` to reuse existing `GRADE_BY_LEVEL` `types.ts:21` and `isValidGradeForLevel` pattern `admission-personal-step.tsx:242`, keeps `Store` simple. `Track` strictly `SECONDARY SECOND|THIRD`-only (`SECONDARY FIRST` and all `INTERMEDIATE 6-9` must have `track=null`).
- **Grade display:** Numeric `Grade` `1|2|3|6…9` for student roleNumber kept, but class `SchoolClassGrade` enum `FIRST|SECOND|THIRD|SIXTH…NINTH` `types.ts:3` display as `FIRST→"1st Secondary"`, `SECOND→"2nd Secondary — Science"` (track suffix), `SIXTH→"6th"` per your `SECONDARY FIRST→"1st" / INTERMEDIATE SIXTH→"6th" + Track inline Science`.
- **Reseed/store:** `lib/mock/seed.ts:34` 9 classes: 5 `SECONDARY` (`FIRST` no track, `SECOND-ART/SCI, THIRD-ART/SCI`) + 4 `INTERMEDIATE` (`SIXTH-NINTH` no track) `code S1,S2A,S2S,S3A,S3S,I6..I9` `sequenceNo 1..9`. `lib/mock/store.ts:9` added `classes:SchoolClass[]` + `KEY bump to v3` + migration for legacy `G9-G12` `sequenceNo 9-12` → new `educationLevel/grade/track` via map, handles `localStorage v2` stale.
- **CRUD:** `app/(shell)/academics/classes/page.tsx:1` migrated from dummy `SEED_CLASSES` local `useState` to `useMockStore` persisted `store.classes`, `DataTable` `data-table.tsx:47` 5 cols `Education Level Badge, Grade human label, Class Name, Code`, `searchKeys ["className","name"]` + `Filter Select Education Level`, `emptyState Card` + `skeleton.tsx:7` loading, `Actions MoreVertical` `View/Edit/Delete` (`Pencil/Trash2` lucide), `onRowClick → /academics/classes/[id]`, `Add Class` `Plus` opens `Dialog` desktop vs `Sheet` bottom mobile.
- **Form:** `components/academics/class-form.tsx:1` `react-hook-form + zodResolver` `zod` `superRefine` enforces Track required iff `SECONDARY SECOND|THIRD`, absent otherwise, plus `GRADE_BY_LEVEL` check + `className` uniqueness within same `level+grade+track`. Live tree: `watch educationLevel` resets `grade` to `FIRST`/`SIXTH`, `watch grade` shows/hides `Track` `Select ART|SCIENCE` and clears `track` when hidden (like `admission:84`).
- **Details:** `app/(shell)/academics/classes/[id]/page.tsx` (new dynamic) uses `DetailHeader:6` `title className + badges educationLevel/grade/track` + breadcrumb `Academic / Classes / <Name>` `lib/nav.ts:121`, `Tabs` `tabs.tsx` 5 lazy tabs `Profile | Students | Subjects | Teachers | Timetable` (exact order), each `DetailPanel` `on tab activation fetch + cache` via `loadedTabs Set`, `Skeleton` while loading `skeleton.tsx:7`, `EmptyState` `empty-state.tsx:5`. Reuses existing `DataTable` for Students/Subjects, `Card` grid for Teachers, `TimetableGrid` filtered to class for Timetable (reuses `academics/timetable/page.tsx:12`).

## Pending questions (ask only if blocking)
- Terminal grade: `SchoolClass.sequenceNo = max` is graduation-eligible until admin config exists.
- Tenant scoping: `X-Tenant-Id` from `localStorage` selector in shell; no subdomain.
- Gender: binary `MALE/FEMALE` `types.ts:12` per go-ahead (was 4, now 2).
- National ID text field — resolved file-only per go-ahead, but revisit if text value later needed.
- INTERMEDIATE Track: confirmed strictly no Track (`SECONDARY SECOND|THIRD` only) — will revisit if `NINTH` pre-track needed.

## 2026-09-24 — Live Academic Affairs Slice
- **Session boundary:** Academic Affair does not implement login. The surrounding shell injects `Authorization` and `X-Tenant-Id`; `academic/lib/api/session.ts` and `app/api/backend/[...path]/route.ts` forward them server-side and fail closed.
- **Roles:** `ADMIN` is principal/super admin, `ACADEMIC_ADMIN` manages academic configuration and provisions Teacher/Student accounts, while `TEACHER` and `STUDENT` remain separate portal roles.
- **Live academic data:** Years, terms, classes, sections, subjects, class details, and timetable now use typed API clients and server-fetched initial data; converted pages do not fall back to mock seeds.
- **Response safety:** Academic services use `backend/src/common/safe-user.select.ts`; nested user responses must not include `passwordHash`.
- **Timetable scope:** The backend now exposes `GET /api/timetable?academicYearId=...&termId=...` and validates time, term, section, teacher, and room conflicts. Migration `0004_timetable_period_scope` is applied and verified on the isolated test branch.
- **Provisioning guards:** Duplicate email and duplicate teacher employee number now return `409 Conflict` instead of a raw Prisma `500`; regression tests added in `memberships.service.spec.ts`. Live E2E smoke passes 13/13 (provisioning, timetable CRUD, authorization boundaries, Next page smoke) against the isolated Neon branch.
- **Deferred storage:** Real Student file uploads remain the next vertical slice; the existing local storage draft is not treated as complete until ownership and finalization tests pass.


## 2026-09-25 � Exam Center: class-exam wizard (slice 1)
- **Shared cascade hook** components/academics/use-level-grade-track.ts owns Level?Grade?Track rules + validation; class-form.tsx keeps its inline copy untouched (no regression risk on a working form).
- **Class-scoped creation is a separate route** (exam-setup/new), not a mode of the type-first wizard: different entry data (cascade+class vs type+term), shared Stepper pattern and reference loaders.
- **Year/term auto-resolved** (current year, first term by sequenceNo); exam type left unset (nullable, assignable on detail). Wizard blocks with setup links when no year/terms exist.
- **Teacher display is read-only by schema necessity** (@@unique([sectionId, subjectId]) allows max one teacher); unassigned state shown inline.

## 2026-09-26 � Admissions: level/grade/track moved to Enrollment (W1)
- **Student grades are numeric (1,2,3/6-9), class grades are names (FIRST..NINTH):** a GRADE_NAMES map bridges them for class filtering. Track is class-filter-only (no student track column exists) � never submitted.
- **Role number preview moved with the fields** to Enrollment and is now derived (not stored): level + grade + transfer snapshot + existing numbers. Drops a whole sync-effect class.
- **Payload byte-identical:** educationLevel/grade/roleNumber still land on the student record; no migration, no DTO change.

## 2026-09-26 � Admissions: level/grade to Enrollment + lossless steps + table width
- **Track is class-filter-only, never stored on the student** (no student track column exists): SECONDARY grades 2/3 filter classes by track; numeric student grades map to class grade names via GRADE_NAMES.
- **Role number preview moved with the fields** to Enrollment and is now derived per-render (level + grade + transfer snapshot + existing numbers), not stored state � kills a whole sync-effect class.
- **Personal step is fully controlled** (values in, onChange out, zero internal form state): conditional step rendering unmounts steps, so any self-owned state � File objects foremost � was losable. Guardian/enrollment already followed this pattern.
- **Overflow fixed at the source rows** (flex-wrap on DataTable toolbar, search form, pagination), not with global clip hacks; table keeps its internal scroll.

## 2026-09-26 � Teacher avatar + orphan sweep (profile image Task #1)
- **No serving bug:** known-good photo key returns HTTP 200 + bytes; pipeline (upload allowlist, move-before-tx, selectors, unguarded download) verified end to end. Placeholders on 7 records are correct behavior (no PROFILE_IMAGE rows), not a rendering defect.
- **Orphans came from out-of-band row deletions** (no code path deletes teacher rows; all in-app document deletes pair row+file cleanup). Swept 3 orphan photo dirs + 1 staging leftover; zero app-code change required.
- **Shared TeacherAvatar** (photo or deterministic-initials fallback) wired into table cells + detail header; uniform pages, no per-teacher branches.

## 2026-09-26 � Teacher detail: assignments card replaces Documents
- **Teaching Assignments card** (subjects x sections + class-teacher badges + counts) fills the Documents slot: operational data the page otherwise never shows, all from the already-loaded 	eacherSelect (no new endpoints).
- **Nothing lost:** header keeps the photo, Identification keeps the ID-proof preview; the removed card only duplicated those two surfaces. Edit-dialog replacement flow untouched.

## 2026-09-26 � Student details page (header + 6 tabs)
- **Shared useStudentActions hook + AdmissionRecordDialog** consumed by table and details: identical Fire/Postpone/Delete/Transfer/Archive/admission behavior in both surfaces; no duplicated logic.
- **Kind/status visibility lives in the UI** (Major-PUBLISHED-only, Casual-SUBMITTED+, never-DRAFT, unknown-kind defaults to Major rule); API returns full history for staff tooling.
- **Document viewing via fetched blob URLs** (inline img / iframe) because the download endpoint forces attachment disposition; thumbnail prefetching dropped (StrictMode double-fetch + revoke leaks) in favor of icon rows.
- **Edit deferred to wizard-edit-mode increment** (pre-fill + update paths); table menu and Profile tab omit Edit with an inline note rather than shipping dead buttons.

## 2026-09-26 � Wizard edit mode
- **Separate edit route** (students/all/[id]/edit) reusing AdmissionPersonalStep (new editMode prop), the exported GuardiansTab, and Stepper � same wizard, pre-filled, not a second form.
- **Edit omits password + document add/remove** (no endpoints exist for either; password changes belong to account management). Existing documents shown read-only; role number displayed, never regenerated.
- **Enrollment diffing:** section change -> transfer endpoint; year-only change -> enroll endpoint; level/grade scalars -> updateStudent. Unchanged enrollment submits nothing.
- **Transfers preselect** via server-read ?studentId= (validated against the loaded list); no client Suspense needed.


## 2026-09-27 - Academics rework: wizards, Classes, bulk timetable editor

### Defaults taken from the task's 6 confirmations (proceeding as stated)
1. **Years/Terms:** minimal config list, not deleted from schema. Routes `/academics/years` + `/academics/terms` stay alive but are **removed from the sidebar wizard list**; reachable via a small "Academic calendar" link on the Academics landing page. Exams/Attendance keep depending on `academicYearId`/`termId`.
2. **"select from the existed departments and subjects"** read as a typo for **subject** (the sentence is about picking department -> subject). Built department -> subject -> teacher.
3. **Subjects wizard create flow is combined:** create one-or-more global Subject records AND optionally multi-assign them to classes in the same submit.
4. **Departments:** inline "create-on-the-fly" inside the Department select (lightest weight). No dedicated Departments screen added.
5. **Week is Mon/Tue/Wed/Thu/Sat** exactly as specified - built literally, no Sunday/Friday.
6. **Teacher timetable tab is fully auto-derived and read-only** from Class-tab entries. No manual override (a manual teacher timetable could contradict the class timetable).

### Structural decisions (not asked, logged here)
- **Kept existing Prisma model names.** Spec �5 sketches `Class`/`ClassSubject`/`ClassTimetableEntry`, but the live schema uses `SchoolClass`/`Section`/`SectionSubject`/`TimetableEntry`. Renaming would be a destructive cross-cutting migration touching enrollment, attendance and exams. **Names stay; the new fields are added to the existing models.**
- **Sections kept as data, removed as a screen.** "Sections are fully absorbed into Class" is honored at the UI level: no standalone Sections wizard/nav item. The `Section` table survives because `StudentEnrollment`, `AttendanceSession` and `SectionSubject` all reference it. Class-level Students/Teachers/Subjects counts aggregate across the class's sections.
- **`SchoolClass.capacity` is nullable (`Int?`)** even though the spec sketch shows `Int`: three existing rows have no value and a NOT NULL column would need a backfill decision on real data. The **form requires a value > 0**, so every class created from now on satisfies the spec's `capacity > 0`.
- **`Subject.departmentId` is nullable (`String?`)** for the same reason: `subjects` already has a row with no department. The create form requires a department; the table renders "�" for legacy rows until edited.
- **`DayOfWeek` enum keeps all 7 values.** Dropping SUN/FRI is a breaking enum migration for no benefit; the timetable UI simply renders the 5 specified days. `TIMETABLE_DAYS` in `timetable-utils.ts` becomes the 5-day set.
- **Timetable restructure is safe:** `timetable_entries` had **0 rows** at the time of writing, so adding `classId`, `isBreak`, `subjectId`, `teacherId` and relaxing `section_subject_id` to nullable carries no data risk. Breaks need a nullable subject link (a break has no subject), which is why `sectionSubjectId` can no longer be NOT NULL.
- **New `SportTimetableEntry` table** rather than overloading `TimetableEntry`: sport rows have a `slotNo` (1|2) instead of `periodNo`, a free-text `sport`, and no subject/teacher at all - forcing them into the academic table would leave most columns null and make the two validation rulesets fight each other.
- **Grid is one component, three configurations** (`<TimetableGrid />` with pluggable cell renderer/editor + validator): Class (editable), Teacher (read-only derived), Sport (editable, different rules). Reusing `components/academics/timetable-grid.tsx`'s name would collide with the existing card-grid, so the new interactive one is `timetable-week-grid.tsx`.
- **Batch save, not per-cell requests:** dirty cells are diffed client-side and committed in one `PUT /timetable/batch`. Cells are keyed `(day, periodNo)` locally; the server upserts by that key.

### Implementation outcomes (verified)
- **Backend:** migration `20260927090000_academics_rework` applied (`migrate diff` empty, `prisma generate` + schema-hash sync run). `tsc --noEmit`, `jest` 128/128 and `nest build` green. Endpoints smoke-tested end-to-end on an isolated instance (`AUTH_NO_SESSION=true`, `PORT=3100`), synthetic rows cleaned up, instance stopped. Backend on port 3000 had to be restarted to pick up the new `dist`.
- **Frontend:** `tsc --noEmit` clean, lint held at the 2-problem baseline for touched dirs (full repo 48, all pre-existing), `next build` green with all four academics routes present.

### Decisions made while implementing (not asked by the task)
- **Save contract = the whole grid.** `PUT /timetable/batch` treats `cells` as complete state (absent = deleted). Period rows and day columns are therefore derived from the loaded data (`buildPeriodRows` / `buildWeekDays`) instead of from the fixed 9-period/5-day defaults, so a row or day that holds data can never be silently dropped by a save that omits it.
- **Valid (subject, teacher) pairs come from the class's own SectionSubjects.** `assertAssignment` requires an exact subject/teacher/class triple, so the cell editor only offers combinations the server can accept - arbitrary picks would surface as opaque 409s.
- **Term selector dropped from the timetable page.** `GET /timetable/class/:id?yearId=` is year-scoped only; term filtering would need a backend change the task does not ask for.
- **Teacher view loads once behind a `loadedFor` key** rather than syncing props into state in an effect, to stay inside `react-hooks/set-state-in-effect`.
- **Dead per-entry CRUD removed:** `listTimetable` / `createTimetableEntry` / `updateTimetableEntry` / `deleteTimetableEntry`, `CreateTimetableEntryPayload`, and `components/academics/timetable-grid.tsx` + `timetable-entry-dialog.tsx`. The week grid replaces them; legacy `/academics/timetable/{class,teacher,room}` and `/timetable/**` already redirect to `/academics/timetable`.

## 2026-09-28 — Guardians many-to-many in the UI (no schema work needed)

- **The join model already existed** (`StudentGuardian` with per-link relationship/flags); the gap was UI-only: every add minted a duplicate Guardian row. Added a Link-existing path (tenant-scoped search + `linkGuardian`, 409 surfaced) alongside Create-new.
- **Orphan rule kept, not changed:** the backend still deletes a Guardian row at its last link (spec’d behavior) rather than accumulating orphans with no cleanup UI.
- **Past duplicates stay manual cleanup** — the link flow prevents new ones; nothing auto-merges.
- Per-student display was already link-scoped; added the “Also guardian of” indicator from sibling data and an updates-everywhere notice on edit.

- **Sections are gone from live paths only.** Mock-mode screens (attendance, reports, promotion, mock seed/store) keep their seeds until those modules convert; admin runs on mocks and financial never referenced sections, so neither is touched.
- **Replacement model:** one `ClassSubject(classId, subjectId, teacherId)` row per class-subject (unique), enrollments and attendance sessions keyed by class, supervisor moved to `SchoolClass.classTeacherId` (editable from the class teachers tab). Legacy timetable rows keep working through their denormalized `classId`/`subjectId`/`teacherId` fields.
- **Data-preserving migration** ports assignments (teacher-carrying row wins), enrollments, sessions (duplicate same-slot sessions merge records into the earliest), exam subjects (re-linked), and supervisors, with abort-on-orphan guards. Runs on an isolated branch against a backup — never blind.
- **Dead ends removed, not stubbed:** per-entry timetable CRUD, section CRUD routes, section screens/components/API clients, and the `ApiSection`/`ApiSectionSubject` types are deleted.

- **One row per subject, stored against the first section** (provisioning “A” when section-less). Sections stay out of the subjects UI entirely; the backend still requires a section id. Legacy multi-section rows dedupe by subject in the table; unassign removes them all together.
- **Assigned subjects are updatable**: the assign dialog reopens in edit mode (subject locked) to change the teacher via the existing update endpoint.
- **Teachers tab is a DataTable** (Name | Employee No. | Status | Subjects | Role, row click → profile). The sections/supervisor management card is gone from this tab; the supervisor badge still displays from loaded data.

- **Assign = one action across all sections** of the class (one POST per section, rows appended optimistically); section-less classes get section “A” provisioned first, mirroring the backend batch behavior. Teacher pick is optional and department-filtered like the timetable editor.
- **Unassign = per-row delete with confirm**; backend 409s (subject used by a timetable) surface as an inline error, never retried blindly.
- No backend, schema, or API changes — all three endpoints already existed.

- **Minimum is 1 lesson-period/day** (breaks excluded), frontend and backend; the selector-driven count replaces the constant in the class editor.
- **Teacher options = assigned teachers in the subject's department** (`teacher.departmentId === subject.departmentId`, intersected with SectionSubject assignments so saves never 409). Legacy null-department subjects fall through to the existing no-teacher hint. No backend change.
- **One stored week per timetable type** (`REGULAR|REVISION|TEST|EXAMINATION`) + free-text `examName` (required iff EXAMINATION, part of the unique key so one class holds several exam weeks). Backfilled `REGULAR`/`''`; hand-authored migration, no data loss.
- **Periods-per-day selector (1–9)** sets grid columns and the save minimum; shared `TimetableScopeControls` (Class | Type | Periods + exam name when EXAMINATION) used by wizard and class-details.
- **Teacher overview groups by teacher × type.** Sport tab untouched (no type concept).

- **Rows are days, columns are lesson periods** in the shared grid, so Teacher, Sport, and class-details flipped together. All grid props kept working; arrow keys swapped axes.
- **Breaks never take period numbers.** Lesson columns are numbered by per-day lesson sequence in time order; each break renders attached after its preceding lesson (leading breaks attach to the first lesson cell). Breaks are placed by choice via “Add break after this period” or by editing time directly.
- **Renumber-on-save:** lessons are renumbered 1..N in time order per day, breaks take 90+ slots. Storage keys stay `(day, periodNo)` — no migration, no API change.
- **Minimum is 2 lesson-periods per day** (breaks excluded), frontend and backend. Columns still show at least 9 and grow with data.
- **Blank template is truly blank** — no pre-seeded breaks; the grid renders empty cells via `showEmptyGrid` so creation starts from nothing.

- **Tab persistence via `?tab=`** (class/teacher/sport, default class), same pattern as the class-details `?tab=` links; invalid values fall back to class.
- **Class tab is select-one-class + the existing `ClassWeekEditor`** — no parallel editor built. The read-only all-classes overview (`class-timetable-list.tsx`) was deleted as dead code.
- **Kept the cell Dialog** instead of switching to an inline Popover: the Dialog is the established pattern and behaves on narrow screens where cell-anchored popovers get cramped.
- **Kept existing model names** (`TimetableEntry`, `SchoolClass`); no schema change was needed for any of this.
- **Bulk row/column select + bulk clear** added as optional grid props so read-only views are unaffected; Delete/Backspace clears the focused cell (Enter already opens it natively).
- **Cross-class teacher conflicts are non-blocking**: warning list + "Double-booked" cell suffix, computed against the year-wide entries the wizard already loads. Class-details (no year entries) skips the check; the teacher tab still flags double-booking globally.
- **Print** reuses the room-card pattern (`window.print()` + `print:hidden` on interactive chrome and working-state boxes).

### Data incident (2026-09-27)- A department cleanup loop filtered the list with `Where-Object { $_.name -like "*Smoke*" }` but the pipeline did not apply, so the loop iterated the **full** department table and deleted 11 rows: `Arabic Language`, `English Language`, `biology`, `chemistry`, `computer`, `engineering`, `geograpghy`, `history`, `physics`, `religion education`, `science`. `mathematics` survived because 2 teachers reference it (FK `Restrict` -> 409).
- No dangling references resulted (0 `teacher.department_id`, 0 `subject.department_id` pointing at missing rows); `subjects` had 0 rows at the time.
- All 11 were restored by exact name under **new UUIDs** - the originals are unrecoverable (no Neon snapshots, no seed file; they were created at runtime through the API). **Anything holding a pre-2026-09-27 department UUID outside this database is now stale.**

## 2026-10-01 � Examination Center redesign Phase 3 (wizard + detail tabs + room seating)
- **New room-assignments UI replaces slot-based RoomsSection on the exam page** (room-assignments-section.tsx): hall-level assignment, auto-seating from ACTIVE enrollments in alpha order, custom student set, invigilator multi-select, seating dialog with name/gender/roll sorts + up/down reorder persisted via PUT order, delete with lock-lift note. Legacy slot-based rooms-section.tsx left untouched (serves dev DBs that have the scheduling tables).
- **Exam detail is now tabbed** (Subjects | Rooms with count badge); header shows Grouped / By-author / Room-locked badges; Add/Remove subject disabled with tooltip while locked (backend 409 is the real guard). Sample card stays outside the tabs.
- **ExamWizardDialog mixes classes**: subjects accumulate across class switches, each row badged with its class, review groups by class, submit sends classIds (backend fans out one row per class). ExamsTab prepends all created rows and shows Author + Rooms columns; ClassExamWizard sends classIds:[classId] and narrows the union response.
- **API layer**: CreateExamPayload.classIds, ApiRoomAssignment/ApiRoomStudent/ApiRoomInvigilator/ApiExamAnalytics types, room endpoints + analytics wired in lib/api/exams.ts.
- **Lint note**: react-hooks/set-state-in-effect fires on the new file exactly as it does on every untouched examinations file (verified on rooms-section.tsx) � house effect patterns kept, no new warning classes introduced (removed one unused helper).
- **Verification:** tsc clean, next build clean (54 pages).

## 2026-10-01 � Examination Center redesign Phase 4 (tickets/marks/analytics + nav cutover)
- **Finding: 8 of 10 exam sections were unbuilt skeletons** � only exam-setup was real. So the cutover wires real pages instead of migrating built UI: hall-tickets (exam ? room ? per-seat ticket cards + window.print), marks-results (exam ? subject grid from class enrollments prefilled with drafts, bulk save, publish-gate confirm), analytics (overall cards + subject table, no charts), and a new rooms page (hall registry create/delete + assignments-by-exam overview).
- **5-section nav** (lib/nav.ts + hub): Exams, Room Tickets, Marks & Results, Rooms, Analytics. Retired skeleton routes redirect rather than 404: dashboard/settings ? exam-setup, scheduling/invigilation ? rooms, report-cards/re-evaluation ? marks-results. No internal links pointed at retired hrefs (verified by grep). Legacy slot-based rooms-section + print route left untouched (dev DBs with scheduling tables).
- **Custom Select has no disabled prop** (shadcn-style wrapper) � gated selects render a muted placeholder div until their prerequisite is chosen.
- **Verification:** tsc + eslint clean on all touched files, next build 55 pages, backend 166/166 jest (unchanged).

## 2026-10-01 � Analytics charts (recharts follow-up)
- **recharts 3.10.1 added (npm, React 19 peers OK):** per-subject average bar + pass-rate bar on the Analytics page above the breakdown table; nulls chart as 0, charts hidden when the exam has no subjects. Verified tsc + eslint + next build (55 pages).
- **npm audit: 1 critical is pre-existing** (Next.js ImageResponse RCE, fix needs next@16.3.8 outside the pinned range) � untouched per scope discipline; recharts itself introduced no findings.
- **No frontend unit tests:** academic has no test runner (no jest/vitest/test script); chart mapping is trivial transforms over the analytics payload, verified via type-check + build rather than new infra.

## 2026-10-02 -- Grade-level subject assignment + class-name-first table
- **Assign to grade (Subjects page):** new SubjectGradeAssignDialog (level/grade cascade, resolved class list preview) calling existing POST /subjects/:id/assign-classes once per grade; per-class flow untouched. No teacher picker in grade mode (teachers differ per class). Fixed the stale lib return type (sectionsCreated -> skippedClasses).
- **Classes table:** Class Name column moved first; sorting/badges/drills unchanged.
- **Live proof:** Mathematics -> all 6 SECOND classes in one call (assigned:6); repeat -> assigned:0 (idempotent skip). Backend stopped again after proving (user keeps port 3000 down).

## 2026-10-03 -- Grades section (derived grouping, no new tables)
- **7 fixed rows** (INTERMEDIATE 6th-9th, SECONDARY 1st-3rd) grouped client-side from the class list, with class/student/capacity counts; empty grades listed with zeros. Row click goes to /academics/grades/[level]/[grade] (unknown slugs 404).
- **Detail mirrors the classes wizard:** same ClassForm (create pre-scoped to level+grade, cascade still governs gender/track), same edit/delete dialogs and API calls, name-first class table, breadcrumb Academics -> Grades -> grade.
- **Nav:** Grades inserted before Classes. The /academics landing redirect (to classes) intentionally untouched.
- **Verification:** tsc + eslint clean, next build 56 pages. No backend, DB, or other-module changes.

## 2026-10-03 -- Grades dev crash fix (Turbopack stale module record)
- **Symptom:** GRADES.find is not a function on /academics/grades/secondary/first in next dev only (production build clean).
- **Cause:** the detail Server Component imported the GRADES constant from grades-client.tsx (a "use client" module); Turbopack dev served a stale record after cache compaction.
- **Fix:** moved GradeKey/GRADES/gradeDetailHref into pure components/academics/grade-keys.ts (no client directive); all three importers re-pointed. No behavior/route/UI change. If the overlay lingers, restart next dev to drop the poisoned cache.

## 2026-10-03 -- Grade-level subject + teacher assignment tabs
- **Subjects tab** on grade detail: distinct-subject rows (classes + teachers involved), assign-to-grade via SubjectGradeAssignDialog (now supports subject picker + fixed-grade lock; subjects-page caller unchanged), unassign-from-grade with per-class confirm. Backend untouched (existing assign/remove endpoints; skips + 404s already server-side).
- **Teachers tab:** flat per class�subject rows (Class | Subject | Teacher) with set/change/clear-teacher via the existing editing dialog and update endpoint (explicit null clears; lib signature widened to string|null). Same subject can carry different teachers per class by construction.
- **Data:** grade page server-loads subjects + teachers; assignments fan out per grade class with Promise.allSettled and refresh after every mutation. Grade detail owns the Classes/Subjects/Teachers tabs.
- **Verification:** tsc + eslint clean, next build 56 pages. No backend, DB, or other-module changes.

## 2026-10-03 -- Grade-assign entry lives on grade details only
- **Removed** the Assign-to-grade action, dialog wiring, and handler from the Subjects page (catalog CRUD only again). The dialog component stays: the grade detail Subjects tab uses it with subject picker + fixed-grade lock.
- **Semantics confirmed:** one-time fan-out to current grade classes (no persistent auto-attach to future classes).

## 2026-10-03 -- Grade detail UI adjustments
- **Add Class moved inside the Classes tab** (header keeps title + counts only).
- **Teachers tab reordered to Teacher | Class | Subject | Action**, unassigned rows first. Set-teacher left the row actions: new standalone Set teacher button opens a Class -> Subject (with current holder shown) -> department-filtered Teacher dialog saving via the existing update endpoint. Rows keep Change/Remove teacher.

## 2026-10-03 -- Track-grouped subject pickers
- **New subject-track-groups.ts:** case-insensitive includes-matching (Quran/Islamic/Arabic/English/Math common; Physics/Chemistry/Biology/Computer/Engineering science; History/Geography/Military art); unmatched subjects fall into Other so nothing ever disappears; flat single group when no track context.
- **Grade dialog:** SECOND/THIRD shows Common + Science + Art groups; 1st/Intermediate stay flat. **Per-class dialog:** new optional track prop (wired from class details + grade teachers tab); grouped only for SCIENCE/ART.
- **Verification:** tsc + eslint clean, next build 56 pages. Labels only � posted subject IDs unchanged; no backend changes.

## 2026-10-03 -- Track-restricted grade assignment (correction)
- **Rule now enforced in the grade dialog:** Science subjects attach only to SCIENCE-track classes, Art only to ART-track, common to all (via trackScopeForSubject; preview list + empty states reflect the restriction). Per-class dialog unchanged.
- **Live proof** (backend briefly started, stopped after): Physics -> 2 Science classes (assigned:2); History -> all 4 ART-track classes incl. pre-existing CS 2/CS A1 (assigned:4); Mathematics -> all 6, assigned:0 (idempotent). Proof rows cleaned up; port 3000 left down.

## 2026-10-03 -- Class details under grade URLs; Classes wizard dropped
- **Nested route** app/.../grades/[level]/[grade]/[id] renders the unchanged ClassDetailsClient with identical server loading; grade scope in the path is validated against the class itself (mismatch 404s). Breadcrumb/back/Edit/tab URLs all derive from the class grade; ?edit=<id> now opens on the grade page.
- **Full removal:** deleted app/.../academics/classes + classes-client.tsx, dropped the nav entry, landing redirects to grades. Dead-link sweep clean.
- **Subjects tab trimmed:** [+ Assign subject] removed from class details (update/unassign per row stay; grade-level assignment is the entry point).
- **Verification:** tsc + eslint clean, next build 55 pages. No backend, DB, or other-module changes.

## 2026-10-22 -- Session layer: Staff-ID sign-in, proxy, and bilingual shell
- **The portal now signs in its own staff.** Academic Affairs logs in with **Staff ID + password only — no email field at all** (explicit product decision 2026-10-22; the earlier "Email or Staff ID" label was removed). `POST /api/session/login` forwards `{staffNumber,password[,tenantId]}` to the backend, which resolves the staff number globally (unique on `User`) and needs no tenant to start. A staff number with **2+ academic memberships** answers `409 {tenants}` and the login card becomes a school picker; no academic access → `403`.
- **Cookies, not localStorage:** `ac_token` + `ac_tenant` (httpOnly, sameSite lax, 7 days) via `lib/api/session.ts`; `app/api/backend/[...path]/route.ts` swaps them for `Authorization`/`X-Tenant-Id`; `proxy.ts` (Next middleware) guards every path but `/login` + `/api/session/login`. The old shell-injected-header path is gone; raw `apiFetch` was deleted from `lib/api/client.ts` so no page can bypass the session.
- **The Secure flag follows the request, not `NODE_ENV`.** Marking the cookie `Secure` while the app is served over plain http (a school on the LAN address) makes the browser drop it silently: login "succeeds", every later call 401s, the page spins forever. The route reads `x-forwarded-proto` and only sets `Secure` on a real https request.
- **A refused session must resolve the spinner.** The profile loader used to `return` early on 401, leaving `loading: true` forever; it now surfaces an error while the proxy redirects to `/login`.
- **Role gate = slug parity with `transport/`:** `ACADEMIC_ROLES = [ADMIN, ACADEMIC_ADMIN, CUSTOM_ACADEMIC_ADMIN]`, because login memberships carry only `id/name/slug` (no portal field) — the same list the transport portal derives from `POSITION_PORTALS`.
- **i18n is a client dictionary, not next-intl:** `lib/i18n/messages.ts` (en + ar, `MessageKey` union), `lib/i18n/locale-provider.tsx` persists `ac_locale` in localStorage, a pre-paint script in `app/layout.tsx` sets `lang`/`dir` before first render (no flash), BaseUI `DirectionProvider` handles logical direction, `globals.css` adds a Noto Sans Arabic fallback. `lib/nav.ts` sections/breadcrumbs carry `labelKey`; the shell uses logical utilities (`ms-auto`, `border-e`, `rtl:rotate-180`). Language toggle is a plain Button pair (EN/عربي) — the academic app has no toggle-group ui component.
- **Profile (`/profile`)** renders `GET /staff/me/profile`: personal card edits first/last/phone via `PUT /auth/me` (**no email field — the endpoint does not accept it** and echoes no phone, so the card re-reads after save), school card shows tenant/branch/academic year/role badges, third card is the destructive logout. Header profile link + LanguageToggle added to the shell.
- **Dashboard (`/dashboard`)** is a live hub: tiles for current academic year, students, classes, subjects (`Promise.all` over the academic read endpoints with per-call fallbacks) + 8 quick-link cards. Storage downloads in `lib/api/storage.ts` now route through `/api/backend/storage/download?objectKey=…` so no page ever holds a direct backend URL.
- **Verification:** `tsc --noEmit` clean; `npm run lint` 53 problems (baseline at HEAD = 54; the only change is one pre-existing `set-state-in-effect` error fixed in `tenant-locked-notice.tsx`, zero new); `next build` clean; backend `scripts/smoke-academic-portal.ts` **15/15** (ts-node) against the real database; live curl proof: login 200 → proxy profile 200 → email-only payload 400.
