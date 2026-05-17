import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek, format, isToday } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { useFamilyId } from "../context/FamilyContext";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
}

const DAY_COLORS = [
  "from-red-50 border-red-200 text-red-800",
  "from-orange-50 border-orange-200 text-orange-800",
  "from-yellow-50 border-yellow-200 text-yellow-800",
  "from-green-50 border-green-200 text-green-800",
  "from-blue-50 border-blue-200 text-blue-800",
  "from-indigo-50 border-indigo-200 text-indigo-800",
  "from-purple-50 border-purple-200 text-purple-800",
];

export function ChuggimTile() {
  const familyId = useFamilyId();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>(`families/${familyId}/schedule`, [
    where("category", "==", "chug"),
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  const sorted = [...events].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

  return (
    <div className="tile h-full flex flex-col">
      <div className="tile-title">🏃 חוגים השבוע</div>

      {loading ? <Skeleton /> : sorted.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין חוגים השבוע</p>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-3 lg:grid-cols-4 gap-2 content-start">
          {sorted.map((ev) => {
            const day    = ev.startTime.toDate().getDay();
            const colors = DAY_COLORS[day];
            const today  = isToday(ev.startTime.toDate());
            const dayName = format(ev.startTime.toDate(), "EEEE", { locale: he });
            return (
              <div
                key={ev.id}
                className={`bg-gradient-to-b ${colors} border rounded-xl px-3 py-2.5 ${today ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
              >
                <div className="text-xs opacity-60 font-medium mb-0.5">{dayName}</div>
                <div className="font-semibold text-sm leading-tight truncate">{ev.title}</div>
                <div className="text-xs opacity-70 mt-1">
                  {format(ev.startTime.toDate(), "HH:mm")}–{format(ev.endTime.toDate(), "HH:mm")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}
