import { where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { startOfDay, endOfDay } from "date-fns";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";

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

interface Props { mode: "today" | "week" }

export function TasksTile({ mode }: Props) {
  const { uid } = useAuth();
  const now = new Date();

  const constraints = mode === "today"
    ? [
        where("assignedTo", "array-contains", uid ?? ""),
        where("dueDate", ">=", Timestamp.fromDate(startOfDay(now))),
        where("dueDate", "<=", Timestamp.fromDate(endOfDay(now))),
      ]
    : [
        where("assignedTo", "array-contains", uid ?? ""),
        where("status", "==", "pending"),
      ];

  const { data: tasks, loading } = useRealtimeCollection<Task>("tasks", constraints);

  async function toggle(task: Task) {
    const done = task.status !== "done";
    await updateDoc(doc(db, "tasks", task.id), {
      status: done ? "done" : "pending",
      completedAt: done ? new Date() : null,
      completedBy: done ? uid : null,
      updatedAt: new Date(),
    });
  }

  const label = mode === "today" ? "✅ משימות היום" : "📋 משימות השבוע";
  const empty  = mode === "today" ? "אין משימות להיום" : "אין משימות פתוחות";

  return (
    <div className="tile h-full flex flex-col">
      <div className="tile-title">{label}</div>
      {loading ? (
        <Skeleton />
      ) : tasks.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">{empty}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1.5">
          {tasks.map((t) => (
            <li
              key={t.id}
              onClick={() => toggle(t)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                t.status === "done"
                  ? "bg-green-400 border-green-400"
                  : "border-gray-300 group-hover:border-green-400"
              }`}>
                {t.status === "done" && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`flex-1 text-sm ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                {t.title}
              </span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] ?? "bg-gray-300"}`} />
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
