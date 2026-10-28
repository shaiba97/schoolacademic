"use client";

import * as React from "react";
import { Eye, Download, FileText, Award } from "lucide-react";
import { Button } from "./button";
import { Label } from "./label";
import { Select } from "./native-select";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export type DocOption = { id: string; label: string; eligible: boolean; hint?: string };

export function DocGenerator({
  title,
  description,
  options,
  docTypes,
  onGenerate,
  preview,
}: {
  title: string;
  description: string;
  options: DocOption[];
  docTypes: string[];
  onGenerate: (optionId: string, docType: string) => void;
  preview?: (optionId: string, docType: string) => React.ReactNode;
}) {
  const [selected, setSelected] = React.useState(options[0]?.id ?? "");
  const [docType, setDocType] = React.useState(docTypes[0] ?? "");
  const [generated, setGenerated] = React.useState(false);

  const current = options.find((o) => o.id === selected);
  const canGenerate = !!current?.eligible;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <FileText size={18} /> {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="doc-option">Student / Cohort</Label>
          <Select id="doc-option" value={selected} onChange={(e) => { setSelected(e.target.value); setGenerated(false); }}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} {o.eligible ? "" : "— not eligible"}
              </option>
            ))}
          </Select>
          {current ? (
            <p className={cn("text-xs flex items-center gap-1", current.eligible ? "text-success" : "text-warning")}>
              <Badge variant={current.eligible ? "success" : "warning"} className="text-xs">{current.eligible ? "Eligible" : "Not eligible"}</Badge>
              {current.hint}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc-type">Document type</Label>
          <Select id="doc-type" value={docType} onChange={(e) => { setDocType(e.target.value); setGenerated(false); }}>
            {docTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {preview && selected && docType ? (
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Eye size={14} /> Preview
          </p>
          {preview(selected, docType)}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          disabled={!canGenerate}
          title={!canGenerate ? "Selection not eligible — finalize data first (published results / graduated status)" : undefined}
          onClick={() => {
            onGenerate(selected, docType);
            setGenerated(true);
          }}
        >
          <Award size={16} /> Generate
        </Button>
        <Button variant="outline" disabled={!generated} onClick={() => onGenerate(selected, docType)}>
          <Download size={16} /> Export PDF
        </Button>
      </div>
      {!canGenerate ? <p className="text-xs text-muted-foreground">Generation gated on finalized data only — certificate requires graduated/eligible, academic document requires published results.</p> : null}
    </div>
  );
}
