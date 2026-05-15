import { useState } from "react";
import { Timestamp, doc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { startOfDay, endOfDay, format } from "date-fns";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";
import { CardHead } from "../components/CardHead";
import { Avatar } from "../components/Avatar";
import { memberOf } from "../family";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: Timestamp;
  priority: string;
  assignedTo: string[];
}

interface Props { mode: "today" | "week" }

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }

function TaskForm({
  initial, defaultDate, onSave, onCancel, onDelete,
}: {
  initial?: { title: string; priority: string; dueDate: string };
  defaultDate: string;
  onSave: (title: string, priority: string, dueDate: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title,    setTitle]    = useState(initial?.title    ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [dueDate,  setDueDate]  = useState(initial?.dueDate  ?? defaultDate);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), priority, dueDate);
  }

  return (
    <form onSubmit={submit} onClick={e => e.stopPropagation()}
      style={{ background: 'var(--fd-task-warm)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="כותרת המשימה..."
        style={{ fontSize: 13, background: 'var(--fd-card)', border: '1px solid var(--fd-divider)', borderRadius: 8, padding: '6px 10px', outline: 'none', fontFamily: 'inherit', color: 'var(--fd-ink)', width: '100%', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          style={{ flex: 1, fontSize: 12, background: 'var(--fd-card)', border: '1px solid var(--fd-divider)', borderRadius: 8, padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }}
        />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          style={{ flex: 1, fontSize: 12, background: 'var(--fd-card)', border: '1px solid var(--fd-divider)', borderRadius: 8, padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }}>
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit"
          style={{ flex: 1, background: 'var(--fd-terra)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          שמור
        </button>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, background: 'var(--fd-divider)', color: 'var(--fd-muted)', border: 'none', borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ביטול
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete}
            style={{ background: 'var(--fd-terra-soft)', color: 'var(--fd-terra)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            מחק
          </button>
        )}
      </div>
    </form>
  );
}

export function TasksTile({ mode }: Props) {
  const now = new Date();
  const [adding,      setAdding]      = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const { data: allTasks, loading } = useRealtimeCollection<Task>("tasks", []);

  const tasks = allTasks.filter(t => {
    if (t.status === "done") return false;
    if (mode === "today") {
      const due = t.dueDate?.toDate?.();
      if (!due) return false;
      return due >= startOfDay(now) && due <= endOfDay(now);
    }
    return true;
  });

  const archived = allTasks
    .filter(t => t.status === "done")
    .sort((a, b) => (b.dueDate?.toMillis?.() ?? 0) - (a.dueDate?.toMillis?.() ?? 0));

  const remaining = tasks.length;

  async function toggle(task: Task) {
    if (editingId) return;
    const done = task.status !== "done";
    await updateDoc(doc(db, "tasks", task.id), { status: done ? "done" : "pending", updatedAt: new Date() });
  }

  async function addTask(title: string, priority: string, dueDate: string) {
    await addDoc(collection(db, "tasks"), {
      title, priority, status: "pending",
      dueDate: Timestamp.fromDate(new Date(dueDate + "T23:59:59")),
      category: "personal", assignedTo: ["family"],
      createdAt: new Date(), updatedAt: new Date(),
    });
    setAdding(false);
  }

  async function editTask(id: string, title: string, priority: string, dueDate: string) {
    await updateDoc(doc(db, "tasks", id), { title, priority, dueDate: Timestamp.fromDate(new Date(dueDate + "T23:59:59")), updatedAt: new Date() });
    setEditingId(null);
  }

  async function deleteTask(id: string) {
    await deleteDoc(doc(db, "tasks", id));
    setEditingId(null);
  }

  return (
    <div className="tile flex flex-col" style={{ height: '100%' }}>
      <CardHead
        he="משימות להיום"
        en="TASKS · TODAY"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {archived.length > 0 && (
              <button onClick={() => setShowArchive(true)}
                style={{ fontSize: 11, color: 'var(--fd-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                ארכיון ({archived.length})
              </button>
            )}
            <div style={{ fontSize: 12, color: 'var(--fd-muted)', fontWeight: 600 }}>
              <span style={{ color: 'var(--fd-terra)' }}>{remaining}</span> נותרו
            </div>
          </div>
        }
      />

      {adding && (
        <div style={{ marginBottom: 8 }}>
          <TaskForm defaultDate={todayStr()} onSave={addTask} onCancel={() => setAdding(false)} />
        </div>
      )}

      {loading ? <Skeleton /> : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
          {tasks.map(t => {
            const member = (t.assignedTo?.[0] && t.assignedTo[0] !== 'family')
              ? memberOf(t.assignedTo[0]) : null;
            const done = t.status === "done";
            const dueTime = t.dueDate?.toDate?.();
            const timeStr = dueTime ? format(dueTime, "HH:mm") : null;

            if (editingId === t.id) {
              return (
                <TaskForm key={t.id}
                  initial={{ title: t.title, priority: t.priority, dueDate: format(t.dueDate.toDate(), "yyyy-MM-dd") }}
                  defaultDate={todayStr()}
                  onSave={(title, priority, dueDate) => editTask(t.id, title, priority, dueDate)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => deleteTask(t.id)}
                />
              );
            }

            return (
              <div key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
                  background: done ? 'transparent' : 'var(--fd-task-warm)',
                  transition: 'background 120ms',
                }}
              >
                {/* Checkbox */}
                <div onClick={() => toggle(t)}
                  style={{
                    width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                    border: done ? 'none' : '1.5px solid var(--fd-faint)',
                    background: done ? 'var(--fd-sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11,
                  }}>
                  {done ? '✓' : ''}
                </div>

                {/* Title */}
                <div onClick={() => { setEditingId(t.id); setAdding(false); }}
                  style={{
                    flex: 1, fontSize: 13.5, fontWeight: 500, minWidth: 0,
                    color: done ? 'var(--fd-faint)' : 'var(--fd-ink)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                  {t.title}
                </div>

                {/* Time */}
                {timeStr && (
                  <div style={{ fontSize: 11, color: 'var(--fd-muted)', fontFamily: 'var(--fd-font-mono)', fontWeight: 500, flexShrink: 0 }}>
                    {timeStr}
                  </div>
                )}

                {/* Avatar */}
                {member
                  ? <Avatar member={member} size={22} />
                  : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--fd-honey-soft)', flexShrink: 0 }} />
                }
              </div>
            );
          })}

          {tasks.length === 0 && !adding && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fd-faint)', fontSize: 13 }}>
              אין משימות להיום
            </div>
          )}
        </div>
      )}

      {/* Archive modal */}
      {showArchive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowArchive(false)}>
          <div style={{ background: 'var(--fd-card)', borderRadius: 24, width: '100%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--fd-divider)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fd-ink)' }}>ארכיון משימות ({archived.length})</span>
              <button onClick={() => setShowArchive(false)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--fd-divider)', border: 'none', cursor: 'pointer', color: 'var(--fd-muted)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archived.map(t => {
                const member = (t.assignedTo?.[0] && t.assignedTo[0] !== 'family')
                  ? memberOf(t.assignedTo[0]) : null;
                const dueDate = t.dueDate?.toDate?.();
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'var(--fd-divider)', opacity: 0.7 }}>
                    <div onClick={() => toggle(t)}
                      style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, background: 'var(--fd-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                      ✓
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fd-muted)', textDecoration: 'line-through', minWidth: 0 }}>
                      {t.title}
                    </div>
                    {dueDate && (
                      <span style={{ fontSize: 10, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)', flexShrink: 0 }}>
                        {format(dueDate, "d/M")}
                      </span>
                    )}
                    {member ? <Avatar member={member} size={20} /> : null}
                    <button onClick={() => deleteTask(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fd-faint)', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      <button onClick={() => { setAdding(true); setEditingId(null); }}
        style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 10,
          border: '1px dashed var(--fd-divider)', background: 'transparent',
          color: 'var(--fd-muted)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
          flexShrink: 0,
        }}>
        + הוסיפו משימה
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 36, borderRadius: 12 }} />
      ))}
    </div>
  );
}
