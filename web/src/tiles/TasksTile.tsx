import { useState } from "react";
import { Timestamp, doc, updateDoc, addDoc, collection, deleteDoc } from "firebase/firestore";
import { startOfDay, endOfDay, format } from "date-fns";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { useFamilyId } from "../context/FamilyContext";
import { db } from "../firebase";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: Timestamp;
  priority: string;
  category: string;
  assignedTo: string[];
}

const priorityDot: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-green-400",
};

const priorityLabel: Record<string, string> = {
  high: "גבוהה", medium: "בינונית", low: "נמוכה",
};

interface Props { mode: "today" | "week" }

const todayStr = () => format(new Date(), "yyyy-MM-dd");

function TaskForm({
  initial,
  defaultDate,
  onSave,
  onCancel,
  onDelete,
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
    <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
      className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-2 border border-gray-200">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="כותרת המשימה..."
        className="w-full text-sm bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
      />
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300"
        >
          {Object.entries(priorityLabel).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit"
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg py-1.5 transition-colors">
          שמור
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-semibold rounded-lg py-1.5 transition-colors">
          ביטול
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete}
            className="bg-red-100 hover:bg-red-200 text-red-500 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
            מחק
          </button>
        )}
      </div>
    </form>
  );
}

export function TasksTile({ mode }: Props) {
  const familyId = useFamilyId();
  const now = new Date();
  const [adding,   setAdding]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: allTasks, loading } = useRealtimeCollection<Task>(`families/${familyId}/tasks`, []);

  const tasks = allTasks.filter((t) => {
    if (mode === "today") {
      const due = t.dueDate?.toDate?.();
      if (!due) return false;
      return due >= startOfDay(now) && due <= endOfDay(now);
    }
    return t.status !== "done";
  });

  async function toggle(task: Task) {
    if (editingId) return;
    const done = task.status !== "done";
    await updateDoc(doc(db, `families/${familyId}/tasks`, task.id), {
      status: done ? "done" : "pending",
      completedAt: done ? new Date() : null,
      updatedAt: new Date(),
    });
  }

  async function addTask(title: string, priority: string, dueDate: string) {
    const due = new Date(dueDate + "T23:59:59");
    await addDoc(collection(db, `families/${familyId}/tasks`), {
      title,
      priority,
      status: "pending",
      dueDate: Timestamp.fromDate(due),
      category: "personal",
      assignedTo: ["family"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setAdding(false);
  }

  async function editTask(id: string, title: string, priority: string, dueDate: string) {
    const due = new Date(dueDate + "T23:59:59");
    await updateDoc(doc(db, `families/${familyId}/tasks`, id), {
      title,
      priority,
      dueDate: Timestamp.fromDate(due),
      updatedAt: new Date(),
    });
    setEditingId(null);
  }

  async function deleteTask(id: string) {
    await deleteDoc(doc(db, `families/${familyId}/tasks`, id));
    setEditingId(null);
  }

  const label       = mode === "today" ? "✅ משימות היום" : "📋 משימות השבוע";
  const empty       = mode === "today" ? "אין משימות להיום" : "אין משימות פתוחות";
  const defaultDate = mode === "today" ? todayStr() : todayStr();

  return (
    <div className="tile flex flex-col min-h-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="tile-title mb-0">{label}</span>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-lg leading-none transition-colors flex-shrink-0"
          title="הוסף משימה"
        >+</button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-2">
          <TaskForm
            defaultDate={defaultDate}
            onSave={addTask}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : tasks.length === 0 && !adding ? (
        <p className="text-gray-400 text-sm text-center mt-8">{empty}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id}>
              {editingId === t.id ? (
                <TaskForm
                  initial={{
                    title: t.title,
                    priority: t.priority,
                    dueDate: format(t.dueDate.toDate(), "yyyy-MM-dd"),
                  }}
                  defaultDate={defaultDate}
                  onSave={(title, priority, dueDate) => editTask(t.id, title, priority, dueDate)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => deleteTask(t.id)}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors group">
                  {/* Checkbox */}
                  <span
                    onClick={() => toggle(t)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      t.status === "done"
                        ? "bg-green-400 border-green-400"
                        : "border-gray-300 group-hover:border-green-400"
                    }`}
                  >
                    {t.status === "done" && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {/* Title — tap to edit */}
                  <span
                    onClick={() => { setEditingId(t.id); setAdding(false); }}
                    className={`flex-1 text-sm cursor-pointer ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}
                  >
                    {t.title}
                  </span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] ?? "bg-gray-300"}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}
