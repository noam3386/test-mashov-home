import { Timestamp } from "firebase/firestore";
import { format, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  category: string;
  allDay: boolean;
}

interface SchoolUpdate {
  id: string;
  type: string;
  title: string;
  subject: string;
  body: string;
  eventDate: Timestamp;
  read: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: Timestamp;
  priority: string;
}

interface EventItem {
  id: string;
  date: Date;
  label: string;
  tag: string;
  tagColor: string;
  dot: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  chug:        "bg-purple-100 text-purple-700",
  school:      "bg-blue-100 text-blue-700",
  family:      "bg-green-100 text-green-700",
  appointment: "bg-amber-100 text-amber-700",
};

const CATEGORY_DOT: Record<string, string> = {
  chug:        "bg-purple-400",
  school:      "bg-blue-400",
  family:      "bg-green-400",
  appointment: "bg-amber-400",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400", medium: "bg-amber-400", low: "bg-green-400",
};

function dayLabel(date: Date): string {
  if (isToday(date))    return "היום";
  if (isTomorrow(date)) return "מחר";
  return format(date, "EEEE d/M", { locale: he });
}

export function EventsBoardTile() {
  const now   = new Date();
  const start = startOfDay(now);
  const end   = addDays(start, 3);

  const { data: scheduleEvents } = useRealtimeCollection<ScheduleEvent>("schedule", []);
  const { data: schoolUpdates }  = useRealtimeCollection<SchoolUpdate>("schoolUpdates", []);
  const { data: tasks }          = useRealtimeCollection<Task>("tasks", []);

  // Build unified event list
  const items: EventItem[] = [];

  // Calendar events — today + 2 days, skip pure "school" category (redundant with timetable)
  for (const ev of scheduleEvents) {
    const d = ev.startTime?.toDate?.();
    if (!d || d < start || d > end) continue;
    if (ev.category === "school") continue;
    items.push({
      id:       "cal_" + ev.id,
      date:     d,
      label:    ev.title,
      tag:      ev.category === "chug" ? "חוג" : ev.category === "family" ? "משפחה" : "פגישה",
      tagColor: CATEGORY_COLOR[ev.category] ?? "bg-gray-100 text-gray-600",
      dot:      CATEGORY_DOT[ev.category]   ?? "bg-gray-300",
    });
  }

  // Homework — pending (read=false), due in next 21 days
  for (const u of schoolUpdates) {
    if (u.type !== "homework" || u.read) continue;
    const d = u.eventDate?.toDate?.();
    if (!d || d < start || d > end) continue;
    items.push({
      id:       "hw_" + u.id,
      date:     d,
      label:    u.subject ? `${u.subject}${u.body ? ` — ${u.body}` : ""}` : u.title,
      tag:      "שיעורי בית",
      tagColor: "bg-sky-100 text-sky-700",
      dot:      "bg-sky-400",
    });
  }

  // Tasks — pending, due in next 21 days
  for (const t of tasks) {
    if (t.status === "done") continue;
    const d = t.dueDate?.toDate?.();
    if (!d || d < start || d > end) continue;
    items.push({
      id:       "task_" + t.id,
      date:     d,
      label:    t.title,
      tag:      "משימה",
      tagColor: "bg-rose-100 text-rose-700",
      dot:      PRIORITY_DOT[t.priority] ?? "bg-gray-300",
    });
  }

  // Sort by date
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by day
  const groups = new Map<string, { label: string; date: Date; items: EventItem[] }>();
  for (const item of items) {
    const key = format(item.date, "yyyy-MM-dd");
    if (!groups.has(key)) {
      groups.set(key, { label: dayLabel(item.date), date: item.date, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  const days = [...groups.values()];

  return (
    <div className="tile h-full flex flex-col">
      <div className="tile-title">📌 אירועים חשובים</div>

      {days.length === 0 ? (
        <p className="text-gray-400 text-sm text-center mt-8">אין אירועים ב-3 הימים הקרובים</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pl-1">
          {days.map((group) => {
            const isNow = isToday(group.date);
            return (
              <div key={format(group.date, "yyyy-MM-dd")}>
                {/* Day header */}
                <div className={`text-xs font-bold mb-1.5 sticky top-0 bg-white pb-0.5 ${
                  isNow ? "text-blue-600" : "text-gray-400"
                }`}>
                  {group.label}
                  {isNow && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle" />}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id}
                      className="flex items-start gap-2 rounded-xl px-2.5 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${item.dot}`} />
                      <span className="flex-1 text-sm text-gray-800 leading-snug line-clamp-2">{item.label}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.tagColor}`}>
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
