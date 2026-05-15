import { Timestamp, where } from "firebase/firestore";
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { CardHead } from "../components/CardHead";
import { Avatar } from "../components/Avatar";
import { memberOf } from "../family";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  category: string;
  memberId?: string[];
}

interface SchoolUpdate {
  id: string;
  type: string;
  subject: string;
  title: string;
  body: string;
  eventDate: Timestamp;
  read: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: Timestamp;
  assignedTo: string[];
}

interface EventItem {
  id: string;
  date: Date;
  label: string;
  en: string;
  when: string;
  time: string;
  barColor: string;
  who: string | null; // family member id
}

function whenLabel(date: Date): string {
  if (isToday(date))    return 'היום';
  if (isTomorrow(date)) return 'מחר';
  return format(date, 'EEEE', { locale: he });
}

const CAT_COLOR: Record<string, string> = {
  chug: 'var(--fd-honey)', family: 'var(--fd-sage)', appointment: 'var(--fd-terra)',
};

export function EventsBoardTile() {
  const now   = new Date();
  const start = startOfDay(now);
  const end   = endOfDay(addDays(now, 6));

  const { data: scheduleEvents } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(start)),
    where("startTime", "<=", Timestamp.fromDate(end)),
  ]);
  const { data: schoolUpdates }  = useRealtimeCollection<SchoolUpdate>("schoolUpdates", [
    where("type", "==", "homework"),
    where("read", "==", false),
  ]);
  const { data: tasks }          = useRealtimeCollection<Task>("tasks", [
    where("status", "!=", "done"),
  ]);

  const items: EventItem[] = [];

  for (const ev of scheduleEvents) {
    const d = ev.startTime?.toDate?.();
    if (!d || d < start || d > end || ev.category === "school") continue;
    const memberId = ev.memberId?.[0] ?? null;
    items.push({
      id:       'cal_' + ev.id,
      date:     d,
      label:    ev.title,
      en:       ev.category,
      when:     whenLabel(d),
      time:     format(d, 'HH:mm'),
      barColor: isToday(d) ? 'var(--fd-terra)' : (CAT_COLOR[ev.category] ?? 'var(--fd-honey)'),
      who:      memberId ? memberId.replace(/^uid_/, '') : null,
    });
  }

  for (const u of schoolUpdates) {
    if (u.type !== "homework" || u.read) continue;
    const d = u.eventDate?.toDate?.();
    if (!d || d < start || d > end) continue;
    items.push({
      id:       'hw_' + u.id,
      date:     d,
      label:    u.subject ? `${u.subject}${u.body ? ` — ${u.body}` : ''}` : u.title,
      en:       'Homework',
      when:     whenLabel(d),
      time:     '',
      barColor: 'var(--fd-honey)',
      who:      'aviv',
    });
  }

  for (const t of tasks) {
    if (t.status === "done") continue;
    const d = t.dueDate?.toDate?.();
    if (!d || d < start || d > end) continue;
    const memberId = t.assignedTo?.[0];
    items.push({
      id:       'task_' + t.id,
      date:     d,
      label:    t.title,
      en:       'Task',
      when:     whenLabel(d),
      time:     format(d, 'HH:mm'),
      barColor: isToday(d) ? 'var(--fd-terra)' : 'var(--fd-muted)',
      who:      memberId && memberId !== 'family' ? memberId.replace(/^uid_/, '') : null,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="tile flex flex-col" style={{ height: '100%' }}>
      <CardHead he="אירועים השבוע" en="THIS WEEK" />

      {items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fd-faint)', fontSize: 13 }}>
          אין אירועים קרובים
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 7).map((item, i) => {
            const member = item.who ? memberOf(item.who) : null;
            const isNow  = item.when === 'היום';
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < Math.min(items.length, 7) - 1 ? '1px solid var(--fd-divider)' : 'none',
              }}>
                {/* Color bar */}
                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: item.barColor, flexShrink: 0 }} />

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fd-ink)', lineHeight: 1.25 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fd-faint)', marginTop: 2, letterSpacing: '0.04em' }}>
                    {item.en}
                  </div>
                </div>

                {/* Day + time */}
                <div style={{ textAlign: 'end', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isNow ? 'var(--fd-terra)' : 'var(--fd-muted)' }}>
                    {item.when}
                  </div>
                  {item.time && (
                    <div style={{ fontSize: 11, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)', marginTop: 2 }}>
                      {item.time}
                    </div>
                  )}
                </div>

                {/* Avatar */}
                {member
                  ? <Avatar member={member} size={26} />
                  : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--fd-honey-soft)', color: 'var(--fd-honey)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>בית</div>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
