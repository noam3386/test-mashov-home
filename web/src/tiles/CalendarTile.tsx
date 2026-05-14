import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek, format, isToday } from "date-fns";
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

const categoryStyle: Record<string, { bg: string; text: string; dot: string }> = {
  chug:        { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  school:      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400"   },
  family:      { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400"  },
  appointment: { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
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
    <div className="tile flex flex-col min-h-48">
      <div className="tile-title">📅 לוח שבועי</div>
      {loading ? (
        <Skeleton />
      ) : sorted.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין אירועים השבוע</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1.5">
          {sorted.map((ev) => {
            const style = categoryStyle[ev.category] ?? categoryStyle.family;
            const todayEvent = isToday(ev.startTime.toDate());
            return (
              <li key={ev.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${style.bg} ${todayEvent ? "ring-2 ring-blue-300" : ""}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <span className={`text-xs font-medium w-14 flex-shrink-0 ${style.text}`}>
                  {ev.allDay ? "כל היום" : format(ev.startTime.toDate(), "HH:mm")}
                </span>
                <span className={`text-sm truncate font-medium ${style.text}`}>{ev.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-9 w-full" />
      ))}
    </div>
  );
}
