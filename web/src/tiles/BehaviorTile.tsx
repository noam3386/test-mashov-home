import { useState } from "react";
import { where, Timestamp } from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface BehaviorEvent {
  id: string;
  eventCode: number;
  categoryName: string;
  justified: number;
  teacherName: string;
  eventDate: Timestamp;
}

const EVENT_STYLE: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  1: { label: "חיסור",            bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-400"    },
  2: { label: "איחור",            bg: "bg-orange-50",  text: "text-orange-600", dot: "bg-orange-400" },
  3: { label: "יציאה מוקדמת",    bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-400" },
  4: { label: "שכחת ציוד",       bg: "bg-blue-50",    text: "text-blue-600",   dot: "bg-blue-400"   },
  5: { label: "הפרעה",            bg: "bg-purple-50",  text: "text-purple-600", dot: "bg-purple-400" },
  6: { label: "אי הכנת שיעורים", bg: "bg-indigo-50",  text: "text-indigo-600", dot: "bg-indigo-400" },
  7: { label: "אי הגשה",         bg: "bg-pink-50",    text: "text-pink-600",   dot: "bg-pink-400"   },
};
const DEFAULT_STYLE = { label: "אחר", bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300" };

function dayLabel(date: Date) {
  if (isToday(date))     return "היום";
  if (isYesterday(date)) return "אתמול";
  return format(date, "d/M", { locale: he });
}

export function BehaviorTile() {
  const [open, setOpen] = useState(false);

  const { data: rawEvents } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates", [where("type", "==", "behavior")]
  );

  const events = [...rawEvents]
    .sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());

  // Show last 3 days worth of events as summary
  const recent = events.slice(0, 3);
  const total  = events.length;

  // Group by code for summary counts
  const absences  = events.filter(e => e.eventCode === 1).length;
  const lates     = events.filter(e => e.eventCode === 2).length;
  const issues    = events.filter(e => ![1, 2].includes(e.eventCode)).length;

  return (
    <>
      <div className="tile h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="tile-title mb-0">🔔 נוכחות</span>
          {total > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              הכל ({total})
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <span className="text-3xl">✅</span>
            <p className="text-xs text-gray-400">הכל תקין</p>
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {absences > 0 && (
                <div className="flex items-center gap-1 bg-red-50 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-600">{absences} חיסורים</span>
                </div>
              )}
              {lates > 0 && (
                <div className="flex items-center gap-1 bg-orange-50 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-xs font-semibold text-orange-600">{lates} איחורים</span>
                </div>
              )}
              {issues > 0 && (
                <div className="flex items-center gap-1 bg-purple-50 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-xs font-semibold text-purple-600">{issues} אחר</span>
                </div>
              )}
            </div>

            {/* Recent events list */}
            <ul className="space-y-1.5 flex-1 overflow-hidden">
              {recent.map((ev) => {
                const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
                const date = ev.eventDate?.toDate?.();
                return (
                  <li key={ev.id}
                    onClick={() => setOpen(true)}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 cursor-pointer hover:opacity-80 transition-opacity ${s.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className={`flex-1 text-xs font-medium truncate ${s.text}`}>
                      {ev.categoryName || s.label}
                    </span>
                    {ev.justified === 1 && (
                      <span className="text-green-500 text-xs flex-shrink-0">✓</span>
                    )}
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {date ? dayLabel(date) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Full modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-bold text-gray-800">🔔 כל האירועים ({total})</span>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {events.map((ev) => {
                const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
                const date = ev.eventDate?.toDate?.();
                return (
                  <div key={ev.id} className={`rounded-xl px-3 py-2.5 ${s.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${s.text}`}>
                        {ev.categoryName || s.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.justified === 1 && (
                          <span className="text-xs text-green-600 font-medium">✓ מוצדק</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {date ? format(date, "EEEE d/M", { locale: he }) : ""}
                        </span>
                      </div>
                    </div>
                    {ev.teacherName && (
                      <div className="text-xs text-gray-400 mt-0.5">{ev.teacherName}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
