import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek, format, isToday } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
  memberId: string[];
}

const dayColors = ["bg-red-100 text-red-700", "bg-orange-100 text-orange-700", "bg-yellow-100 text-yellow-700", "bg-green-100 text-green-700", "bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700", "bg-purple-100 text-purple-700"];

export function ChuggimTile() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("category", "==", "chug"),
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  const sorted = [...events].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

  return (
    <div className="tile flex flex-col min-h-40">
      <div className="tile-title">🏃 חוגים השבוע</div>
      {loading ? (
        <Skeleton />
      ) : sorted.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין חוגים השבוע</p>
      ) : (
        <ul className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 content-start">
          {sorted.map((ev) => {
            const day = ev.startTime.toDate().getDay();
            const colors = dayColors[day];
            const today = isToday(ev.startTime.toDate());
            return (
              <li key={ev.id} className={`rounded-xl px-3 py-2.5 ${colors} ${today ? "ring-2 ring-offset-1 ring-purple-400" : ""}`}>
                <div className="font-semibold text-sm truncate">{ev.title}</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {format(ev.startTime.toDate(), "EEEE", { locale: he })} · {format(ev.startTime.toDate(), "HH:mm")}–{format(ev.endTime.toDate(), "HH:mm")}
                </div>
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
    <div className="grid grid-cols-2 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}
