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

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

interface Props {
  mode: "today" | "week";
}

export function TasksTile({ mode }: Props) {
  const { uid } = useAuth();
  const now = new Date();

  const constraints =
    mode === "today"
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

  async function toggleDone(task: Task) {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "done" ? "pending" : "done",
      completedAt: task.status === "done" ? null : new Date(),
      completedBy: task.status === "done" ? null : uid,
      updatedAt: new Date(),
    });
  }

  return (
    <div className="tile col-span-4 row-span-3 flex flex-col overflow-hidden">
      <h2 className="tile-title">{mode === "today" ? "משימות היום" : "משימות השבוע"}</h2>
      {loading ? (
        <Skeleton />
      ) : tasks.length === 0 ? (
        <p className="text-slate-400 text-sm mt-2">
          {mode === "today" ? "אין משימות להיום" : "אין משימות פתוחות"}
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1 mt-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => toggleDone(t)}>
              <span className={`w-4 h-4 rounded border-2 flex-shrink-0 ${t.status === "done" ? "bg-green-500 border-green-500" : "border-slate-500"}`} />
              <span className={`flex-1 truncate ${t.status === "done" ? "line-through text-slate-500" : ""}`}>
                {t.title}
              </span>
              <span className={`text-xs ${priorityColors[t.priority] ?? ""}`}>
                {t.priority === "high" ? "!" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 mt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-5 bg-slate-700 rounded animate-pulse" />
      ))}
    </div>
  );
}
