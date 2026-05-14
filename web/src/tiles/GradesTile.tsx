import { where, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";

interface SchoolUpdate {
  id: string;
  memberId: string;
  type: string;
  subject: string;
  title: string;
  grade: number | null;
  maxGrade: number | null;
  weight: number | null;
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
    <div className="tile col-span-4 row-span-3 flex flex-col overflow-hidden">
      <h2 className="tile-title">ציונים אחרונים</h2>
      {loading ? (
        <Skeleton />
      ) : grades.length === 0 ? (
        <p className="text-slate-400 text-sm mt-2">אין ציונים עדיין</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-2 mt-2">
          {grades.map((g) => (
            <li
              key={g.id}
              className={`flex items-center gap-2 text-sm p-1 rounded ${!g.read ? "bg-slate-700" : ""}`}
              onClick={() => !g.read && markRead(g.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{g.subject}</div>
                <div className="text-slate-400 text-xs truncate">{g.title}</div>
              </div>
              <div className="text-left flex-shrink-0">
                <div className={`font-bold text-lg ${gradeColor(g.grade, g.maxGrade)}`}>
                  {g.grade ?? "—"}
                </div>
                <div className="text-slate-500 text-xs">/{g.maxGrade ?? 100}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function gradeColor(grade: number | null, max: number | null): string {
  if (grade == null || max == null) return "text-slate-400";
  const pct = grade / max;
  if (pct >= 0.85) return "text-green-400";
  if (pct >= 0.6) return "text-yellow-400";
  return "text-red-400";
}

function Skeleton() {
  return (
    <div className="space-y-2 mt-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-8 bg-slate-700 rounded animate-pulse" />
      ))}
    </div>
  );
}
