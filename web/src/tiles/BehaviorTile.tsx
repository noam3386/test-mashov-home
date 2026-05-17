import { useState } from "react";
import { where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { format, isToday, isYesterday, subDays, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";

interface BehaviorEvent {
  id: string;
  eventCode: number;
  categoryName: string;
  subjectName: string;
  justified: number;
  teacherName: string;
  eventDate: Timestamp;
  read: boolean;
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

async function markRead(id: string) {
  await updateDoc(doc(db, "schoolUpdates", id), { read: true });
}

function EventDetailModal({
  ev,
  onClose,
  onArchive,
}: {
  ev: BehaviorEvent;
  onClose: () => void;
  onArchive: () => void;
}) {
  const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
  const date = ev.eventDate?.toDate?.();

  async function handleArchive() {
    await markRead(ev.id);
    onArchive();
  }

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
          {ev.subjectName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">מקצוע</span>
              <span className="text-sm font-medium text-gray-800">{ev.subjectName}</span>
            </div>
          )}
          {ev.teacherName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">מורה</span>
              <span className="text-sm text-gray-700">{ev.teacherName}</span>
            </div>
          )}
        </div>
        {/* Archive button — only for unread events */}
        {!ev.read && (
          <div className="px-4 pb-4">
            <button
              onClick={handleArchive}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>📦</span> סמן כנקרא והעבר לארכיון
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({
  ev,
  archived,
  onClick,
}: {
  ev: BehaviorEvent;
  archived?: boolean;
  onClick: () => void;
}) {
  const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
  const date = ev.eventDate?.toDate?.();
  return (
    <div
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity ${archived ? "opacity-50 bg-gray-50" : s.bg}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-sm ${archived ? "text-gray-400" : s.text}`}>
          {ev.categoryName || s.label}
        </span>
        <div className="flex items-center gap-2">
          {!archived && (ev.justified === 1 ? (
            <span className="text-xs text-green-600 font-medium">✓ מוצדק</span>
          ) : (
            <span className="text-xs text-red-400 font-medium">✗ לא מוצדק</span>
          ))}
          {archived && <span className="text-xs text-gray-300">📦</span>}
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
}

export function BehaviorTile({ memberId }: { memberId?: string }) {
  const [listOpen, setListOpen]       = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [detail, setDetail]           = useState<BehaviorEvent | null>(null);

  const constraints = memberId
    ? [where("memberId", "==", memberId), where("type", "==", "behavior")]
    : [where("type", "==", "behavior")];

  const { data: rawEvents } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates", constraints
  );

  const cutoff = startOfDay(subDays(new Date(), 7));

  const all     = [...rawEvents].sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());
  // Active: unread AND within last 7 days
  const active  = all.filter(e => !e.read && e.eventDate.toDate() >= cutoff);
  // Archive: read OR older than 7 days
  const archive = all.filter(e => e.read  || e.eventDate.toDate() < cutoff);

  const recent   = active.slice(0, 3);
  const absences = active.filter(e => e.eventCode === 1).length;
  const lates    = active.filter(e => e.eventCode === 2).length;
  const issues   = active.filter(e => ![1, 2].includes(e.eventCode)).length;

  function openDetail(ev: BehaviorEvent) {
    setListOpen(false);
    setDetail(ev);
  }

  return (
    <>
      <div className="tile h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="tile-title mb-0">🔔 נוכחות</span>
          {active.length > 0 && (
            <button
              onClick={() => setListOpen(true)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              הכל ({active.length})
            </button>
          )}
        </div>

        {active.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <span className="text-3xl">✅</span>
            <p className="text-xs text-gray-400">הכל תקין</p>
            {archive.length > 0 && (
              <button
                onClick={() => setListOpen(true)}
                className="mt-1 text-xs text-gray-400 underline underline-offset-2"
              >
                ארכיון ({archive.length})
              </button>
            )}
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

            {/* Recent active events */}
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
        <EventDetailModal
          ev={detail}
          onClose={() => setDetail(null)}
          onArchive={() => setDetail(null)}
        />
      )}

      {/* Full list + archive modal */}
      {listOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setListOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-bold text-gray-800">🔔 נוכחות</span>
              <button onClick={() => setListOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {/* Active events */}
              {active.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">פעיל ({active.length})</p>
                  {active.map(ev => (
                    <EventRow key={ev.id} ev={ev} onClick={() => openDetail(ev)} />
                  ))}
                </>
              )}

              {/* Archive toggle */}
              {archive.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setArchiveOpen(o => !o)}
                    className="w-full flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wide py-1 hover:text-gray-600 transition-colors"
                  >
                    <span>📦 ארכיון ({archive.length})</span>
                    <span>{archiveOpen ? "▲" : "▼"}</span>
                  </button>
                  {archiveOpen && (
                    <div className="mt-2 space-y-2">
                      {archive.map(ev => (
                        <EventRow key={ev.id} ev={ev} archived onClick={() => openDetail(ev)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {active.length === 0 && archive.length === 0 && (
                <p className="text-center text-gray-300 text-sm py-8">אין אירועים</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
