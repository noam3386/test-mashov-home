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
}

export function ChuggimTile() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("category", "==", "chug"),
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  const sorted = [...events].sort(
    (a, b) => a.startTime.toMillis() - b.startTime.toMillis()
  );

  return (
    <div className="tile col-span-8 row-span-4 flex flex-col overflow-hidden">
      <h2 className="tile-title">חוגים השבוע</h2>
      {loading ? (
        <Skeleton />
      ) : sorted.length === 0 ? (
        <p className="text-slate-400 text-sm mt-2">אין חוגים השבוע</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1 mt-2">
          {sorted.map((ev) => (
            <li key={ev.id} className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <span className="text-slate-400 w-24 flex-shrink-0">
                {format(ev.startTime.toDate(), "EEEE HH:mm", { locale: he })}
              </span>
              <span className="truncate">{ev.title}</span>
              <span className="text-slate-500 text-xs">
                עד {format(ev.endTime.toDate(), "HH:mm")}
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
