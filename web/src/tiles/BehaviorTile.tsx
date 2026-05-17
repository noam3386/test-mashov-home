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

const EVENT_STYLE: Record<number, { label: string; bg: string; text: string; dot: string; badge: string }> = {
  1: { label: "חיסור",            bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-400",    badge: "bg-red-100 text-red-700"    },
  2: { label: "איחור",            bg: "bg-orange-50",  text: "text-orange-600", dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700" },
  3: { label: "יציאה מוקדמת",    bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
  4: { label: "שכחת ציוד",       bg: "bg-blue-50",    text: "text-blue-600",   dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700"   },
  5: { label: "הפרעה",            bg: "bg-purple-50",  text: "text-purple-600", dot: "bg-purple-400", badge: "bg-purple-100 text-purple-700" },
  6: { label: "אי הכנת שיעורים", bg: "bg-indigo-50",  text: "text-indigo-600", dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700" },
  7: { label: "אי הגשה",         bg: "bg-pink-50",    text: "text-pink-600",   dot: "bg-pink-400",   badge: "bg-pink-100 text-pink-700"   },
};
const DEFAULT_STYLE = { label: "אחר", bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600" };

function dayLabel(date: Date) {
  if (isToday(date))     return "היום";
  if (isYesterday(date)) return "אתמול";
  return format(date, "d/M", { locale: he });
}

function EventDetailModal({ ev, onClose }: { ev: BehaviorEvent; onClose: () => void }) {
  const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
  const date = ev.eventDate?.toDate?.();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4 sm:items-center"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className={`font-bold text-base ${s.text}`}>
            {ev.categoryName || s.label}
          </span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            ✕
          </button>
        </div>
        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">סוג</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
              {s.label}
            </span>
          </div>
          {date && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">תאריך</span>
              <span className="text-sm font-medium text-gray-800">
                {format(date, "EEEE, d בMMMM yyyy", { locale: he })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">מוצדק</span>
            {ev.justified === 1 ? (
              <span className="text-sm font-semibold text-green-600">✓ כן</span>
            ) : (
              <span className="text-sm font-semibold text-red-500">✗ לא</span>
            )}
          </div>
          {ev.teacherName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">מורה</span>
              <span className="text-sm text-gray-700">{ev.teacherName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BehaviorTile({ memberId }: { memberId?: string }) {
  const [listOpen, setListOpen] = useState(false);
  const [detail, setDetail]     = useState<BehaviorEvent | null>(null);

  const constraints = memberId
    ? [where("memberId", "==", memberId), where("type", "==", "behavior")]
    : [where("type", "==", "behavior")];

  const { data: rawEvents } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates", constraints
  );

  const events = [...rawEvents]
    .sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());

  const recent   = events.slice(0, 3);
  const total    = events.length;
  const absences = events.filter(e => e.eventCode === 1).length;
  const lates    = events.filter(e => e.eventCode === 2).length;
  const issues   = events.filter(e => ![1, 2].includes(e.eventCode)).length;

  return (
    <>
      <div className="tile h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="tile-title mb-0">🔔 נוכחות</span>
          {total > 0 && (
            <button
              onClick={() => setListOpen(true)}
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

            {/* Recent events — click for detail */}
            <ul className="space-y-1.5 flex-1 overflow-hidden">
              {recent.map((ev) => {
                const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
                const date = ev.eventDate?.toDate?.();
                return (
                  <li key={ev.id}
                    onClick={() => setDetail(ev)}
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

      {/* Single event detail popup */}
      {detail && (
        <EventDetailModal ev={detail} onClose={() => setDetail(null)} />
      )}

      {/* Full list modal */}
      {listOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setListOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-bold text-gray-800">🔔 כל האירועים ({total})</span>
              <button onClick={() => setListOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {events.map((ev) => {
                const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
                const date = ev.eventDate?.toDate?.();
                return (
                  <div key={ev.id}
                    onClick={() => { setListOpen(false); setDetail(ev); }}
                    className={`rounded-xl px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity ${s.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${s.text}`}>
                        {ev.categoryName || s.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.justified === 1 ? (
                          <span className="text-xs text-green-600 font-medium">✓ מוצדק</span>
                        ) : (
                          <span className="text-xs text-red-400 font-medium">✗ לא מוצדק</span>
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
