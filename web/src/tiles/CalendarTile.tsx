import { useState } from "react";
import { where, Timestamp } from "firebase/firestore";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, format, isToday, isSameMonth,
} from "date-fns";
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

const CAT_COLOR: Record<string, string> = {
  chug:        "bg-purple-400",
  school:      "bg-blue-400",
  family:      "bg-green-400",
  appointment: "bg-amber-400",
};

const CAT_LABEL: Record<string, string> = {
  chug: "חוג", school: "בית ספר", family: "משפחה", appointment: "פגישה",
};

const CAT_BADGE: Record<string, string> = {
  chug:        "bg-purple-100 text-purple-700",
  school:      "bg-blue-100 text-blue-700",
  family:      "bg-green-100 text-green-700",
  appointment: "bg-amber-100 text-amber-700",
};

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function CalendarTile() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selected, setSelected] = useState<ScheduleEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: events } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(calStart)),
    where("startTime", "<=", Timestamp.fromDate(calEnd)),
  ]);

  const byDay = new Map<string, ScheduleEvent[]>();
  events.forEach((ev) => {
    const key = format(ev.startTime.toDate(), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function openDay(day: Date, dayEvs: ScheduleEvent[]) {
    if (dayEvs.length === 0) return;
    setSelectedDate(day);
    setSelected(dayEvs);
  }

  return (
    <div className="tile h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
        >‹</button>
        <span className="font-bold text-gray-700 text-sm">
          {format(viewMonth, "MMMM yyyy", { locale: he })}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, -1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
        >›</button>
      </div>

      {/* Day name row */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 flex-1 gap-0.5">
            {week.map((day) => {
              const key    = format(day, "yyyy-MM-dd");
              const dayEvs = byDay.get(key) ?? [];
              const today  = isToday(day);
              const inMonth= isSameMonth(day, viewMonth);
              const hasEvs = dayEvs.length > 0;
              return (
                <div
                  key={key}
                  onClick={() => openDay(day, dayEvs)}
                  className={`rounded-lg p-1 flex flex-col min-h-0 transition-colors ${
                    hasEvs ? "cursor-pointer" : ""
                  } ${
                    today   ? "bg-blue-50 ring-1 ring-blue-300" :
                    inMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50"
                  }`}
                >
                  <div className={`text-xs font-semibold mb-0.5 text-center leading-none ${
                    today   ? "text-blue-600" :
                    inMonth ? "text-gray-700" : "text-gray-300"
                  }`}>
                    {format(day, "d")}
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                    {dayEvs.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`rounded text-white text-center leading-none px-0.5 py-0.5 truncate ${CAT_COLOR[ev.category] ?? "bg-gray-400"}`}
                        style={{ fontSize: "0.55rem" }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvs.length > 3 && (
                      <div className="text-gray-400 text-center leading-none" style={{ fontSize: "0.55rem" }}>
                        +{dayEvs.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-1.5 flex-wrap">
        {(["chug","school","family","appointment"] as const).map((cat) => (
          <div key={cat} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${CAT_COLOR[cat]}`} />
            <span className="text-xs text-gray-400">{CAT_LABEL[cat]}</span>
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      {selected && selectedDate && (
        <div
          className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center z-10 p-3"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-800 text-sm">
                {format(selectedDate, "EEEE, d MMMM", { locale: he })}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.map((ev) => {
                const start = ev.startTime.toDate();
                const end   = ev.endTime?.toDate?.();
                return (
                  <div key={ev.id} className={`rounded-xl px-3 py-2.5 ${CAT_BADGE[ev.category] ?? "bg-gray-100 text-gray-700"}`}>
                    <div className="font-semibold text-sm leading-snug">{ev.title}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {ev.allDay
                        ? "כל היום"
                        : end
                        ? `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`
                        : format(start, "HH:mm")}
                    </div>
                    <div className="text-xs opacity-60 mt-0.5">{CAT_LABEL[ev.category] ?? ev.category}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
