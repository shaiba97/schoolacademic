"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { sourceLabel } from "@/components/teachers/teacher-credential-dialog";
import type { ApiTeacherCredential } from "@/lib/api/types";

/**
 * One document = one ID card. The card owns the document's name and origin;
 * viewing, printing and downloading are delegated to the shared viewer so
 * every card sizes its file the same way.
 */
export function TeacherCredentialCard({
  credential,
  pending,
  onEdit,
  onDelete,
}: {
  credential: ApiTeacherCredential;
  pending?: boolean;
  onEdit: (credential: ApiTeacherCredential) => void;
  onDelete: (credential: ApiTeacherCredential) => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{credential.title}</CardTitle>
          <Badge variant={credential.source === "TEACHER" ? "info" : "muted"} className="shrink-0">
            {credential.source === "TEACHER" ? "Teacher" : "Academic affairs"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{sourceLabel(credential.source)}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <DocumentViewer document={credential} className="flex-1" />

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(credential)}
            disabled={pending}
          >
            <Pencil size={14} aria-hidden /> Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            aria-label={`Delete ${credential.title}`}
          >
            <Trash2 size={14} aria-hidden /> Delete
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{credential.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The document and its file are permanently removed from this teacher record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDelete(credential);
              }}
            >
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
