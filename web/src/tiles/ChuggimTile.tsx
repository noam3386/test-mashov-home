import { where, Timestamp } from "firebase/firestore";
import { startOfWeek, endOfWeek } from "date-fns";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { CardHead } from "../components/CardHead";
import { Avatar } from "../components/Avatar";
import { memberOf } from "../family";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
  memberId?: string[];
}

const DAYS = [
  { he: 'ראשון', en: 'SUN', idx: 0 },
  { he: 'שני',   en: 'MON', idx: 1 },
  { he: 'שלישי', en: 'TUE', idx: 2 },
  { he: 'רביעי', en: 'WED', idx: 3 },
  { he: 'חמישי', en: 'THU', idx: 4 },
];

function fmt(d: Date) {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function ChuggimTile() {
  const now       = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 0 });

  const { data: events, loading } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("category", "==", "chug"),
    where("startTime", ">=", Timestamp.fromDate(weekStart)),
    where("startTime", "<=", Timestamp.fromDate(weekEnd)),
  ]);

  const byDay = new Map<number, ScheduleEvent[]>();
  for (const ev of events) {
    const d = ev.startTime.toDate().getDay();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(ev);
  }

  return (
    <div className="tile flex flex-col" style={{ height: '100%' }}>
      <CardHead he="חוגי השבוע" en="WEEKLY ACTIVITIES" />

      {loading ? <Skeleton /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, flex: 1, minHeight: 0 }}>
          {DAYS.map(day => {
            const dayEvents = (byDay.get(day.idx) ?? []).sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
            return (
              <div key={day.he} style={{
                border: '1px solid var(--fd-divider)', borderRadius: 16,
                padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                overflow: 'hidden',
              }}>
                {/* Day header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fd-ink)' }}>{day.he}</div>
                  <div style={{ fontSize: 9, color: 'var(--fd-faint)', letterSpacing: '0.12em', fontWeight: 600 }}>{day.en}</div>
                </div>

                {/* Activities */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {dayEvents.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--fd-faint)', fontWeight: 500 }}>
                      פנוי
                    </div>
                  ) : dayEvents.map(ev => {
                    const rawId = ev.memberId?.[0] ?? '';
                    const member = rawId ? memberOf(rawId) : null;
                    const start  = fmt(ev.startTime.toDate());
                    const end    = ev.endTime ? fmt(ev.endTime.toDate()) : '';
                    return (
                      <div key={ev.id} style={{
                        background: member ? member.soft : 'var(--fd-honey-soft)',
                        borderRadius: 10, padding: '8px 10px',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {member && <Avatar member={member} size={18} />}
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fd-ink)', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                            {ev.title}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 10.5, fontWeight: 600,
                          color: member ? member.color : 'var(--fd-honey)',
                          fontFamily: 'var(--fd-font-mono)',
                          marginInlineStart: member ? 24 : 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {start}{end ? `–${end}` : ''}
                        </div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, flex: 1 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton" style={{ borderRadius: 16 }} />
      ))}
    </div>
  );
}
