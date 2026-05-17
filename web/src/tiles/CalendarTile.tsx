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

interface TimetableEntry {
  id: string;
  day: number;
  lesson: number;
  subjectName: string;
  teacherName: string;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvs, setSelectedEvs] = useState<ScheduleEvent[]>([]);
  const [selectedTT, setSelectedTT] = useState<TimetableEntry[]>([]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: events } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(calStart)),
    where("startTime", "<=", Timestamp.fromDate(calEnd)),
  ]);

  const { data: timetableAll } = useRealtimeCollection<TimetableEntry>("timetable", []);

  // Group calendar events by date
  const byDay = new Map<string, ScheduleEvent[]>();
  events.forEach((ev) => {
    const key = format(ev.startTime.toDate(), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  });

  // Group timetable by JS day-of-week (0=Sun)
  const ttByDow = new Map<number, TimetableEntry[]>();
  timetableAll.forEach((entry) => {
    if (!ttByDow.has(entry.day)) ttByDow.set(entry.day, []);
    ttByDow.get(entry.day)!.push(entry);
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function openDay(day: Date, dayEvs: ScheduleEvent[], tt: TimetableEntry[]) {
    if (dayEvs.length === 0 && tt.length === 0) return;
    setSelectedDate(day);
    setSelectedEvs(dayEvs);
    setSelectedTT([...tt].sort((a, b) => a.lesson - b.lesson));
  }

  const isOpen = selectedDate !== null;

  return (
    <div className="tile h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <button onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">‹</button>
        <span className="font-bold text-gray-700 text-sm">
          {format(viewMonth, "MMMM yyyy", { locale: he })}
        </span>
        <button onClick={() => setViewMonth(m => addMonths(m, -1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">›</button>
      </div>

      {/* Single unified grid: 1 header row + N week rows, all in one grid for pixel-perfect alignment */}
      <div
        className="flex-1 min-h-0 grid gap-px"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `1.25rem repeat(${weeks.length}, 1fr)`,
        }}
      >
        {/* Day-name header cells */}
        {DAY_NAMES.map((d) => (
          <div key={d} className="flex items-center justify-center text-xs font-semibold text-gray-400">
            {d}
          </div>
        ))}

        {/* All day cells flattened */}
        {weeks.flat().map((day) => {
          const key     = format(day, "yyyy-MM-dd");
          const dayEvs  = byDay.get(key) ?? [];
          const tt      = ttByDow.get(day.getDay()) ?? [];
          const today   = isToday(day);
          const inMonth = isSameMonth(day, viewMonth);
          const clickable = dayEvs.length > 0 || tt.length > 0;

          return (
            <div
              key={key}
              onClick={() => openDay(day, dayEvs, tt)}
              className={`rounded p-0.5 flex flex-col min-h-0 overflow-hidden transition-colors ${clickable ? "cursor-pointer" : ""} ${
                today   ? "bg-blue-50 ring-1 ring-blue-300" :
                inMonth ? "bg-white hover:bg-gray-50"        : "bg-gray-50"
              }`}
            >
              {/* Day number */}
              <div className={`text-center leading-none mb-px flex-shrink-0 ${
                today ? "font-bold text-blue-600" : inMonth ? "text-gray-700" : "text-gray-300"
              }`} style={{ fontSize: "0.6rem" }}>
                {format(day, "d")}
              </div>

              <div className="flex flex-col gap-px flex-1 min-h-0 overflow-hidden">
                {/* Timetable row */}
                {tt.length > 0 && inMonth && (
                  <div
                    className="bg-blue-400 rounded-sm text-white text-center leading-none px-0.5 flex-shrink-0"
                    style={{ fontSize: "0.5rem", paddingTop: "1px", paddingBottom: "1px" }}
                  >
                    {tt.length} שיעורים
                  </div>
                )}
                {/* Calendar events */}
                {dayEvs.slice(0, tt.length > 0 ? 1 : 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`rounded-sm text-white text-center leading-none px-0.5 truncate flex-shrink-0 ${CAT_COLOR[ev.category] ?? "bg-gray-400"}`}
                    style={{ fontSize: "0.5rem", paddingTop: "1px", paddingBottom: "1px" }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvs.length > (tt.length > 0 ? 1 : 2) && (
                  <div className="text-gray-400 text-center leading-none flex-shrink-0" style={{ fontSize: "0.5rem" }}>
                    +{dayEvs.length - (tt.length > 0 ? 1 : 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-1 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-gray-400">מערכת שעות</span>
        </div>
        {(["chug","family","appointment"] as const).map((cat) => (
          <div key={cat} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${CAT_COLOR[cat]}`} />
            <span className="text-xs text-gray-400">{CAT_LABEL[cat]}</span>
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center z-10 p-3"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-800 text-sm">
                {format(selectedDate!, "EEEE, d MMMM", { locale: he })}
              </span>
              <button onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {/* Timetable section */}
              {selectedTT.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">מערכת שעות</div>
                  <div className="space-y-1">
                    {selectedTT.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 bg-blue-50 rounded-lg px-2.5 py-1.5">
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-blue-200 text-blue-800 font-bold flex items-center justify-center text-xs">
                          {entry.lesson}
                        </span>
                        <span className="text-sm font-medium text-blue-900 truncate">{entry.subjectName}</span>
                        {entry.teacherName && (
                          <span className="mr-auto text-xs text-blue-400 flex-shrink-0">{entry.teacherName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar events section */}
              {selectedEvs.length > 0 && (
                <div>
                  {selectedTT.length > 0 && (
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">אירועים</div>
                  )}
                  <div className="space-y-1.5">
                    {selectedEvs.map((ev) => {
                      const start = ev.startTime.toDate();
                      const end   = ev.endTime?.toDate?.();
                      return (
                        <div key={ev.id} className={`rounded-xl px-3 py-2.5 ${CAT_BADGE[ev.category] ?? "bg-gray-100 text-gray-700"}`}>
                          <div className="font-semibold text-sm leading-snug">{ev.title}</div>
                          <div className="text-xs opacity-70 mt-0.5">
                            {ev.allDay ? "כל היום"
                              : end ? `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`
                              : format(start, "HH:mm")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
