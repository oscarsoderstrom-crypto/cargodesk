import { useState, useEffect } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { updateShipment } from "../db/schema.js";

export default function NotesTab({ T, shipment, onUpdate }) {
  const [newNote, setNewNote] = useState("");
  const notes = shipment.notes || [];

  const addNote = async () => {
    if (!newNote.trim()) return;
    const note = {
      id: crypto.randomUUID(),
      text: newNote.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    await updateShipment(shipment.id, { notes: updated });
    setNewNote("");
    if (onUpdate) onUpdate();
  };

  const deleteNote = async (noteId) => {
    const updated = notes.filter(n => n.id !== noteId);
    await updateShipment(shipment.id, { notes: updated });
    if (onUpdate) onUpdate();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }
  };

  const fmtTimestamp = (ts) => {
    const d = new Date(ts);
    const date = d.toLocaleDateString("fi-FI", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  };

  return (
    <div>
      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Add a note... (Enter to save, Shift+Enter for new line)"
            rows={2}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
              border: `1px solid ${T.border1}`, background: T.bg3, color: T.text0,
              outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
            }}
          />
        </div>
        <button onClick={addNote} disabled={!newNote.trim()}
          style={{
            padding: "0 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, alignSelf: "flex-end",
            color: newNote.trim() ? "white" : T.text3,
            background: newNote.trim() ? T.accent : T.bg4,
            border: "none", cursor: newNote.trim() ? "pointer" : "not-allowed", height: 40,
          }}>
          Add
        </button>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div>
          {notes.map((note, i) => (
            <div key={note.id} style={{
              display: "flex", gap: 12, padding: "14px 0",
              borderBottom: i < notes.length - 1 ? `1px solid ${T.border0}` : "none",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <MessageSquare size={14} color={T.text2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.text}</div>
                <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>{fmtTimestamp(note.timestamp)}</div>
              </div>
              <button onClick={() => deleteNote(note.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, padding: 4, flexShrink: 0, alignSelf: "flex-start" }}
                onMouseEnter={e => e.currentTarget.style.color = T.red}
                onMouseLeave={e => e.currentTarget.style.color = T.text3}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: T.text3, background: T.bg2, borderRadius: 10, border: `1px solid ${T.border1}` }}>
          No notes yet — add updates, reminders, or observations above
        </div>
      )}
    </div>
  );
}
