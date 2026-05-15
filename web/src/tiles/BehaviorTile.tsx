import { useState } from "react";
import { where, doc, updateDoc, Timestamp } from "firebase/firestore";
import { format, isToday, isYesterday, addDays, subDays, isBefore, isAfter, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { CardHead } from "../components/CardHead";
import { db } from "../firebase";

interface BehaviorEvent {
  id: string;
  eventCode: number;
  categoryName: string;
  justified: number;
  teacherName: string;
  eventDate: Timestamp;
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

const EVENT_STYLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "חיסור",            color: 'var(--fd-terra)',  bg: 'var(--fd-terra-soft)'  },
  2: { label: "איחור",            color: 'var(--fd-honey)',  bg: 'var(--fd-honey-soft)'  },
  3: { label: "יציאה מוקדמת",    color: 'var(--fd-honey)',  bg: 'var(--fd-honey-soft)'  },
  4: { label: "שכחת ציוד",       color: 'var(--fd-forest)', bg: 'var(--fd-forest-soft)' },
  5: { label: "הפרעה",            color: 'var(--fd-terra)',  bg: 'var(--fd-terra-soft)'  },
  6: { label: "אי הכנת שיעורים", color: 'var(--fd-honey)',  bg: 'var(--fd-honey-soft)'  },
  7: { label: "אי הגשה",         color: 'var(--fd-terra)',  bg: 'var(--fd-terra-soft)'  },
};
const DEFAULT_STYLE = { label: "אחר", color: 'var(--fd-muted)', bg: 'var(--fd-divider)' };

function dayLabel(date: Date) {
  if (isToday(date))     return "היום";
  if (isYesterday(date)) return "אתמול";
  return format(date, "d/M", { locale: he });
}

export function BehaviorTile() {
  const [showAll,    setShowAll]    = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const { data: rawEvents } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates", [where("type", "==", "behavior")]
  );
  const events = [...rawEvents].sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());
  const recent = events.slice(0, 2);

  const oneWeekAgo  = startOfDay(subDays(new Date(), 7));
  const sevenAhead  = startOfDay(addDays(new Date(), 7));
  const { data: hwRaw } = useRealtimeCollection<SchoolUpdate>(
    "schoolUpdates", [where("type", "==", "homework")]
  );

  // Active: not done, within this week and next 7 days
  const homework = hwRaw
    .filter(u => !u.read && isAfter(u.eventDate.toDate(), oneWeekAgo) && isBefore(u.eventDate.toDate(), sevenAhead))
    .sort((a, b) => a.eventDate.toMillis() - b.eventDate.toMillis());

  // Archive: marked as done
  const archived = hwRaw
    .filter(u => u.read)
    .sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis())
    .slice(0, 20);

  async function toggleHw(id: string, current: boolean) {
    await updateDoc(doc(db, "schoolUpdates", id), { read: !current });
  }

  return (
    <>
      <div className="tile flex flex-col" style={{ height: '100%' }}>
        <CardHead he="אביב · נוכחות" en="ATTENDANCE" right={
          events.length > 0 ? (
            <button onClick={() => setShowAll(true)}
              style={{ fontSize: 11, color: 'var(--fd-terra)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              הכל ({events.length})
            </button>
          ) : undefined
        } />

        {/* Behavior — max 2 rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--fd-faint)', textAlign: 'center', padding: '4px 0' }}>✅ הכל תקין</div>
          ) : recent.map(ev => {
            const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
            const date = ev.eventDate?.toDate?.();
            return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: s.bg }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: s.color }}>{ev.categoryName || s.label}</div>
                {ev.justified === 1 && <span style={{ fontSize: 10, color: 'var(--fd-sage)', fontWeight: 600 }}>✓</span>}
                <span style={{ fontSize: 10, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)' }}>
                  {date ? dayLabel(date) : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--fd-divider)', marginBottom: 10 }} />

        {/* Homework header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--fd-faint)', letterSpacing: '0.12em', fontWeight: 600 }}>שיעורי בית</div>
          {archived.length > 0 && (
            <button onClick={() => setShowArchive(true)}
              style={{ fontSize: 10, color: 'var(--fd-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              ארכיון ({archived.length})
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {homework.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--fd-faint)' }}>
              אין שיעורי בית פתוחים
            </div>
          ) : homework.map(hw => (
            <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'var(--fd-task-warm)', border: '1px solid var(--fd-honey-soft)' }}>
              <button onClick={() => toggleHw(hw.id, hw.read)}
                style={{ width: 18, height: 18, borderRadius: 6, border: '1.5px solid var(--fd-faint)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {hw.read ? <span style={{ color: 'var(--fd-sage)', fontSize: 11 }}>✓</span> : null}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fd-ink)' }}>{hw.subject}</div>
                {hw.body && <div style={{ fontSize: 11, color: 'var(--fd-muted)', marginTop: 1 }}>{hw.body}</div>}
              </div>
              <span style={{ fontSize: 10, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)', flexShrink: 0 }}>
                {format(hw.eventDate.toDate(), "d/M", { locale: he })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Archive modal */}
      {showArchive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowArchive(false)}>
          <div style={{ background: 'var(--fd-card)', borderRadius: 24, width: '100%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--fd-divider)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fd-ink)' }}>ארכיון שיעורי בית</span>
              <button onClick={() => setShowArchive(false)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--fd-divider)', border: 'none', cursor: 'pointer', color: 'var(--fd-muted)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archived.map(hw => (
                <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--fd-divider)', opacity: 0.7 }}>
                  <button onClick={() => toggleHw(hw.id, hw.read)}
                    style={{ width: 18, height: 18, borderRadius: 6, border: '1.5px solid var(--fd-sage)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--fd-sage)', fontSize: 11 }}>✓</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fd-muted)', textDecoration: 'line-through' }}>{hw.subject}</div>
                    {hw.body && <div style={{ fontSize: 11, color: 'var(--fd-faint)', marginTop: 1 }}>{hw.body}</div>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)', flexShrink: 0 }}>
                    {format(hw.eventDate.toDate(), "d/M", { locale: he })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full behavior modal */}
      {showAll && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowAll(false)}>
          <div style={{ background: 'var(--fd-card)', borderRadius: 24, width: '100%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--fd-divider)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fd-ink)' }}>נוכחות · כל האירועים ({events.length})</span>
              <button onClick={() => setShowAll(false)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--fd-divider)', border: 'none', cursor: 'pointer', color: 'var(--fd-muted)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(ev => {
                const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
                const date = ev.eventDate?.toDate?.();
                return (
                  <div key={ev.id} style={{ borderRadius: 12, padding: '10px 14px', background: s.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: s.color }}>{ev.categoryName || s.label}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {ev.justified === 1 && <span style={{ fontSize: 11, color: 'var(--fd-sage)', fontWeight: 600 }}>✓ מוצדק</span>}
                        <span style={{ fontSize: 11, color: 'var(--fd-faint)' }}>
                          {date ? format(date, "EEEE d/M", { locale: he }) : ''}
                        </span>
                      </div>
                    </div>
                    {ev.teacherName && <div style={{ fontSize: 11, color: 'var(--fd-faint)', marginTop: 2 }}>{ev.teacherName}</div>}
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
