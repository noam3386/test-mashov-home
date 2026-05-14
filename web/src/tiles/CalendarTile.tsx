import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
  memberId: string[];
  allDay: boolean;
}

const categoryColors: Record<string, string> = {
  chug: "bg-purple-500",
  school: "bg-blue-500",
  family: "bg-green-500",
  appointment: "bg-yellow-500",
};

export function CalendarTile() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  const sorted = [...events].sort(
    (a, b) => a.startTime.toMillis() - b.startTime.toMillis()
  );

  return (
    <div className="tile col-span-5 row-span-4 flex flex-col overflow-hidden">
      <h2 className="tile-title">לוח שבועי</h2>
      {loading ? (
        <Skeleton />
      ) : sorted.length === 0 ? (
        <p className="text-slate-400 text-sm mt-2">אין אירועים השבוע</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1 mt-2">
          {sorted.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${categoryColors[ev.category] ?? "bg-slate-500"}`} />
              <span className="text-slate-400 w-16 flex-shrink-0">
                {ev.allDay ? "כל היום" : format(ev.startTime.toDate(), "HH:mm")}
              </span>
              <span className="truncate">{ev.title}</span>
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
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-5 bg-slate-700 rounded animate-pulse" />
      ))}
    </div>
  );
}
