"use client";

import * as React from "react";
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type FileValue = { file: File; previewUrl?: string; path: string };

export type FilePickerProps = {
  id: string;
  label: string;
  accept: string; // e.g., "image/jpeg,image/png" or "image/*,application/pdf"
  maxSizeMB: number;
  required?: boolean;
  value?: FileValue | null;
  onChange: (value: FileValue | null) => void;
  helperText?: string;
  error?: string;
};

const MAX_DIMENSIONS_NOTE = "Image dimensions sanity: max 4000×4000 recommended";

function isImage(file: File) {
  return file.type.startsWith("image/");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilePicker({ id, label, accept, maxSizeMB, required, value, onChange, helperText, error }: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const displayError = error ?? localError;

  function validate(file: File): string | null {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size === 0) return "This file is empty — choose a different file.";
    if (file.size > maxBytes) return `File too large: ${formatSize(file.size)} > ${maxSizeMB}MB`;
    // accept check — allow wildcard image/* handling
    const accepts = accept
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ok = accepts.some((a) => {
      if (a === "*/*") return true;
      if (a.endsWith("/*")) return file.type.startsWith(a.replace("/*", "/"));
      return file.type === a || file.name.toLowerCase().endsWith(a.replace(".", "").toLowerCase());
    });
    // also allow pdf extension check fallback
    if (!ok && file.type) return `Invalid type: ${file.type}. Expected ${accept}`;
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    const previewUrl = isImage(file) ? URL.createObjectURL(file) : undefined;
    // simulate draft path — temp location tied to in-progress admission per spec §3
    const path = `tmp/admissions/${id}/${Date.now()}-${file.name}`;
    // sanity: warn if image huge dimensions would be checked after load; here we just pass through and note helper
    onChange({ file, previewUrl, path });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset input so same file can be re-selected after remove
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label} {required ? <span className="text-destructive" aria-hidden>*</span> : <span className="text-muted-foreground font-normal text-xs"> (optional)</span>}
      </label>

      {!value ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border border-dashed bg-card p-4 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver ? "bg-muted border-primary" : "hover:bg-muted/50",
            displayError ? "border-destructive bg-destructive/5" : undefined,
          )}
          aria-label={`${label} file picker`}
        >
          <Upload size={20} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium mt-2">Click to choose or drag file here</p>
          <p className="text-xs text-muted-foreground mt-1">{helperText ?? `Accept: ${accept} · Max ${maxSizeMB}MB`}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{MAX_DIMENSIONS_NOTE}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
          {value.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.previewUrl} alt={`${label} preview`} className="size-16 rounded-md object-cover border shrink-0" />
          ) : (
            <span className="inline-flex size-16 items-center justify-center rounded-md border bg-muted shrink-0">
              <FileText size={20} className="text-muted-foreground" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(value.file.size)} · {value.file.type || "unknown type"}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{value.path}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Staged in draft temp — finalized on final wizard submit (§3)</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={() => onChange(null)}>
            <X size={16} />
          </Button>
        </div>
      )}

      <input ref={inputRef} id={id} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={onInputChange} />

      {/* Replace action when file selected */}
      {value ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-primary hover:underline">
          Replace file
        </button>
      ) : null}

      {displayError ? (
        <p role="alert" className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle size={12} /> {displayError}
        </p>
      ) : null}

      {helperText && !displayError && !value ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
