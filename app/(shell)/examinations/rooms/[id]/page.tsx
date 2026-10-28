"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useParams } from "next/navigation";
import { listStudents } from "@/lib/api/students";
import { getHall } from "@/lib/api/halls";
import { academicErrorMessage } from "@/components/academics/academic-utils";

export default function RoomDetailPage() {
  const { id } = useParams() as { id: string };
  const [room, setRoom] = React.useState<ApiHall | null>(null);
  const [students, setStudents] = React.useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = React.useState<string>("");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function fetchRoom() {
      try {
        const result = await getHall(id);
        setRoom(result);
        setLoading(false);
      } catch (cause) {
        setError(academicErrorMessage(cause, "Unable to load room"));
        setLoading(false);
      }
    }
    fetchRoom();

    async function fetchStudents() {
      try {
        const result = await listStudents({ page: 1, limit: 100 });
        setStudents(result.data.map((s) => s.id));
      } catch (cause) {
        setError(academicErrorMessage(cause, "Unable to load students"));
      }
    }
    fetchStudents();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto my-4" />
        <p className="text-center text-muted-foreground">Loading room details...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8">
        <p className="text-destructive">Room not found</p>
        <Link href="/examinations/rooms" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{room.name} · Room {room.roomNumber ?? "—"}</CardTitle>
          <p className="text-sm text-muted-foreground">Capacity: {room.capacity}</p>
          {room.type && <p className="text-sm text-muted-foreground">Type: {room.type}</p>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Course: {room.tenantId ? "Linked to class" : "No class assigned"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Students</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {students.length} students available — select students to assign to this room
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {students.map((studentId) => {
              const isSelected = selectedStudent === studentId;
              return (
                <div
                  key={studentId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isSelected ? "bg-primary/10" : "text-muted-foreground"}`}
                >
                  <Input
                    id={`student-${studentId}`}
                    defaultValue={""}
                    readOnly
                    inputMode="text"
                    className="w-24"
                  />
                  <span className="flex-1 truncate">{studentId}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setSelectedStudent(studentId)}
                    aria-label={`Assign ${studentId} to room`}
                  >
                    <Badge variant="secondary">
                      + 
                    </Badge>
                  </Button>
                </div>
              );
            })}
          </div>

          {selectedStudent && (
            <Dialog open={assignOpen} onOpenChange={(o) => setAssignOpen(o)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Student to Room</DialogTitle>
                  <DialogDescription>
                    Assign {selectedStudent} to room {room.name}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setAssignOpen(false)}>
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="mt-3"
          >
            <Badge /> Assign Student
          </Button>
        </CardContent>
      </Card>

      <div>
        <Link href="/examinations/rooms" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Rooms
        </Link>
      </div>
    </div>
  );
}

interface ApiHall {
  id: string;
  tenantId?: string;
  name: string;
  capacity: number;
  type: "PHYSICAL" | "VIRTUAL";
  roomNumber?: number;
}