import { where, orderBy, limit, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface BehaviorEvent {
  id: string;
  eventCode: number;
  categoryName: string;
  justified: number;
  groupId: number | null;
  teacherName: string;
  eventDate: Timestamp;
}

const EVENT_LABELS: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: "חיסור",           bg: "bg-red-100",    text: "text-red-700"    },
  2: { label: "איחור",           bg: "bg-orange-100", text: "text-orange-700" },
  3: { label: "יציאה מוקדמת",   bg: "bg-yellow-100", text: "text-yellow-700" },
  4: { label: "שכחת ציוד",      bg: "bg-blue-100",   text: "text-blue-700"   },
  5: { label: "הפרעה",           bg: "bg-purple-100", text: "text-purple-700" },
  6: { label: "אי הכנת שיעורים",bg: "bg-indigo-100", text: "text-indigo-700" },
  7: { label: "אי הגשה",        bg: "bg-pink-100",   text: "text-pink-700"   },
};
const DEFAULT_EVENT = { label: "אחר", bg: "bg-gray-100", text: "text-gray-600" };

export function BehaviorTile() {
  const { data: events, loading } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates",
    [where("type", "==", "behavior"), orderBy("eventDate", "desc"), limit(12)]
  );

  return (
    <div className="tile flex flex-col min-h-48">
      <div className="tile-title">🔔 נוכחות והתנהגות</div>

      {loading ? <Skeleton /> : events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
          <span className="text-4xl mb-2">✅</span>
          <p className="text-sm">אין אירועים לאחרונה</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-1.5">
          {events.map((ev) => {
            const style = EVENT_LABELS[ev.eventCode] ?? DEFAULT_EVENT;
            const date  = ev.eventDate?.toDate?.();
            return (
              <li key={ev.id} className="flex items-center gap-2 text-xs">
                <span className={`flex-shrink-0 rounded-md px-2 py-0.5 font-semibold ${style.bg} ${style.text}`}>
                  {ev.categoryName || style.label}
                </span>
                {ev.justified === 1 && (
                  <span className="text-green-600 font-medium flex-shrink-0">✓</span>
                )}
                <span className="text-gray-400 flex-shrink-0 mr-auto">
                  {date ? format(date, "d/M", { locale: he }) : ""}
                </span>
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
    <div className="space-y-1.5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-6 w-full" />
      ))}
    </div>
  );
}
