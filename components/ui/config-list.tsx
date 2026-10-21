"use client";

import * as React from "react";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

export type ConfigItem = { id: string; label: string; description?: string; meta?: string };

export function ConfigList({
  items,
  onAdd,
  onUpdate,
  onDelete,
  addLabel = "Add item",
  emptyTitle = "No items",
}: {
  items: ConfigItem[];
  onAdd?: (label: string) => void;
  onUpdate?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
  addLabel?: string;
  emptyTitle?: string;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-medium">{addLabel} list</h2>
        {onAdd ? (
          <Button size="sm" variant="outline" onClick={() => setNewOpen((v) => !v)}>
            <Plus size={16} /> {addLabel}
          </Button>
        ) : null}
      </div>
      {newOpen ? (
        <div className="flex gap-2 p-4 border-b bg-muted/20">
          <Input placeholder="Name…" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
          <Button
            size="sm"
            onClick={() => {
              if (newLabel.trim() && onAdd) onAdd(newLabel.trim());
              setNewLabel("");
              setNewOpen(false);
            }}
          >
            <Check size={16} /> Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNewOpen(false)}>
            <X size={16} />
          </Button>
        </div>
      ) : null}
      <ul className="divide-y">
        {items.length === 0 ? (
          <li className="p-8 text-center text-sm text-muted-foreground">{emptyTitle}</li>
        ) : (
          items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-4">
              {editing === it.id ? (
                <>
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1" autoFocus />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onUpdate) onUpdate(it.id, draft.trim());
                      setEditing(null);
                    }}
                  >
                    <Check size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{it.label}</p>
                    {it.description ? <p className="text-sm text-muted-foreground truncate">{it.description}</p> : null}
                    {it.meta ? <p className="text-xs text-muted-foreground mt-1">{it.meta}</p> : null}
                  </div>
                  {onUpdate ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${it.label}`}
                      onClick={() => {
                        setEditing(it.id);
                        setDraft(it.label);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${it.label}`} onClick={() => onDelete(it.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  ) : null}
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
