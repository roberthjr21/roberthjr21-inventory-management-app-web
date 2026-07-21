"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Check, NotebookPen, Plus, Trash2 } from "lucide-react"

export function NotesTab() {
  const { data, addNote, toggleNote, deleteNote } = useStore()
  const [text, setText] = useState("")

  const handleAdd = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addNote(trimmed)
    setText("")
  }

  const pending = data.notes.filter((n) => !n.done)
  const done = data.notes.filter((n) => n.done)

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd()
          }}
          placeholder="Escribe una nota o recordatorio..."
          className="h-12 rounded-2xl text-base"
          aria-label="Nueva nota"
        />
        <Button
          size="icon"
          className="size-12 shrink-0 rounded-2xl"
          onClick={handleAdd}
          aria-label="Agregar nota"
        >
          <Plus className="size-5" />
        </Button>
      </div>

      {data.notes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <NotebookPen className="size-8 opacity-50" />
          <p>Tu bloc de notas está vacío.</p>
          <p className="text-sm">Anota qué comprar, pedidos o recordatorios.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {pending.map((n) => (
          <NoteRow key={n.id} text={n.text} done={false} onToggle={() => toggleNote(n.id)} onDelete={() => deleteNote(n.id)} />
        ))}
      </div>

      {done.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Completadas
          </h3>
          {done.map((n) => (
            <NoteRow key={n.id} text={n.text} done onToggle={() => toggleNote(n.id)} onDelete={() => deleteNote(n.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteRow({
  text,
  done,
  onToggle,
  onDelete,
}: {
  text: string
  done: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <button
        onClick={onToggle}
        aria-label={done ? "Marcar como pendiente" : "Marcar como hecho"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {done && <Check className="size-4" />}
      </button>
      <p
        className={cn(
          "flex-1 text-sm leading-snug",
          done && "text-muted-foreground line-through",
        )}
      >
        {text}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        onClick={onDelete}
        aria-label="Eliminar nota"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
