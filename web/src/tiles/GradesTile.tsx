import { where, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";

interface SchoolUpdate {
  id: string;
  subject: string;
  title: string;
  grade: number | null;
  maxGrade: number | null;
  teacherName: string;
  eventDate: Timestamp;
  read: boolean;
}

export function GradesTile() {
  const { data: grades, loading } = useRealtimeCollection<SchoolUpdate>(
    "schoolUpdates",
    [where("type", "==", "grade"), orderBy("eventDate", "desc"), limit(5)]
  );

  async function markRead(id: string) {
    await updateDoc(doc(db, "schoolUpdates", id), { read: true });
  }

  return (
    <div className="tile h-full flex flex-col">
      <div className="tile-title">🎓 ציונים אחרונים</div>
      {loading ? (
        <Skeleton />
      ) : grades.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין ציונים עדיין</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-2">
          {grades.map((g) => {
            const { color, bg } = gradeStyle(g.grade, g.maxGrade);
            const date = g.eventDate?.toDate?.()?.toLocaleDateString("he-IL") ?? "";
            return (
              <li
                key={g.id}
                onClick={() => !g.read && markRead(g.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${!g.read ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{g.subject}</div>
                  <div className="text-xs text-gray-400 truncate">{g.title} · {date}</div>
                </div>
                <div className={`flex-shrink-0 rounded-xl px-3 py-1.5 ${bg}`}>
                  <span className={`text-lg font-bold ${color}`}>{g.grade ?? "—"}</span>
                  <span className={`text-xs ${color} opacity-60`}>/{g.maxGrade ?? 100}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function gradeStyle(grade: number | null, max: number | null) {
  if (grade == null || max == null) return { color: "text-gray-400", bg: "bg-gray-100" };
  const pct = grade / max;
  if (pct >= 0.85) return { color: "text-green-700", bg: "bg-green-100" };
  if (pct >= 0.6)  return { color: "text-amber-700", bg: "bg-amber-100" };
  return { color: "text-red-700", bg: "bg-red-100" };
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}
