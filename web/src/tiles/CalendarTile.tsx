import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek, format, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
  allDay: boolean;
}

const categoryStyle: Record<string, string> = {
  chug:        "bg-purple-100 text-purple-700 border-purple-200",
  school:      "bg-blue-100 text-blue-700 border-blue-200",
  family:      "bg-green-100 text-green-700 border-green-200",
  appointment: "bg-amber-100 text-amber-700 border-amber-200",
};

const categoryIcon: Record<string, string> = {
  chug: "🏃", school: "📚", family: "👨‍👩‍👧", appointment: "🏥",
};

function dayLabel(date: Date): string {
  if (isToday(date))    return "היום";
  if (isTomorrow(date)) return "מחר";
  return format(date, "EEEE d/M", { locale: he });
}

export function CalendarTile() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  // Group by day
  const byDay = new Map<string, ScheduleEvent[]>();
  [...events]
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis())
    .forEach((ev) => {
      const key = format(ev.startTime.toDate(), "yyyy-MM-dd");
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(ev);
    });

  return (
    <div className="tile h-full flex flex-col">
      <div className="tile-title">📅 לוח שבועי</div>

      {loading ? <Skeleton /> : byDay.size === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין אירועים השבוע</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {[...byDay.entries()].map(([dateKey, dayEvents]) => {
            const date = new Date(dateKey + "T12:00:00");
            const todayDay = isToday(date);
            return (
              <div key={dateKey}>
                {/* Day header */}
                <div className={`flex items-center gap-2 mb-1.5 ${todayDay ? "text-blue-600" : "text-gray-400"}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${todayDay ? "text-blue-600" : "text-gray-400"}`}>
                    {dayLabel(date)}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.map((ev) => {
                    const style = categoryStyle[ev.category] ?? categoryStyle.family;
                    const icon  = categoryIcon[ev.category] ?? "📌";
                    return (
                      <div key={ev.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-xs ${style}`}>
                        <span>{icon}</span>
                        <span className="w-10 flex-shrink-0 font-medium">
                          {ev.allDay ? "כל היום" : format(ev.startTime.toDate(), "HH:mm")}
                        </span>
                        <span className="truncate font-medium">{ev.title}</span>
                        {!ev.allDay && (
                          <span className="mr-auto flex-shrink-0 opacity-60">
                            עד {format(ev.endTime.toDate(), "HH:mm")}
                          </span>
                        )}
                      </div>
                    );
                  })}
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
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="skeleton h-4 w-24 mb-2" />
          <div className="space-y-1">
            <div className="skeleton h-7 w-full" />
            <div className="skeleton h-7 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
