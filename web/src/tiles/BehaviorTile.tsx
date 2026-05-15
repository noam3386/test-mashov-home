import { useState } from "react";
import { where } from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { CardHead } from "../components/CardHead";

interface BehaviorEvent {
  id: string;
  eventCode: number;
  categoryName: string;
  justified: number;
  teacherName: string;
  eventDate: import("firebase/firestore").Timestamp;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll]       = useState(false);

  const { data: rawEvents } = useRealtimeCollection<BehaviorEvent>(
    "schoolUpdates", [where("type", "==", "behavior")]
  );
  const events = [...rawEvents].sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());
  const recent = events.slice(0, 5);

  const selected = selectedId ? events.find(e => e.id === selectedId) ?? null : null;

  return (
    <>
      <div className="tile flex flex-col" style={{ height: '100%', position: 'relative' }}>
        <CardHead
          he="נוכחות · אביב"
          en="ATTENDANCE"
          right={events.length > 0 ? (
            <button onClick={() => setShowAll(true)}
              style={{ fontSize: 11, color: 'var(--fd-terra)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              הכל ({events.length})
            </button>
          ) : undefined}
        />

        {events.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 28 }}>✅</div>
            <div style={{ fontSize: 12, color: 'var(--fd-faint)' }}>הכל תקין</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map(ev => {
              const s    = EVENT_STYLE[ev.eventCode] ?? DEFAULT_STYLE;
              const date = ev.eventDate?.toDate?.();
              const isSelected = ev.id === selectedId;
              return (
                <div key={ev.id}>
                  <div
                    onClick={() => setSelectedId(isSelected ? null : ev.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: isSelected ? '10px 10px 0 0' : 10,
                      cursor: 'pointer', background: s.bg,
                    }}>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: s.color }}>
                      {ev.categoryName || s.label}
                    </div>
                    {ev.justified === 1 && (
                      <span style={{ fontSize: 11, color: 'var(--fd-sage)', fontWeight: 600 }}>✓</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)' }}>
                      {date ? dayLabel(date) : ''}
                    </span>
                  </div>

                  {isSelected && selected && (() => {
                    const date2 = selected.eventDate?.toDate?.();
                    return (
                      <div style={{ background: s.bg, borderRadius: '0 0 10px 10px', padding: '6px 10px 8px', borderTop: `1px solid ${s.color}22` }}>
                        {date2 && (
                          <div style={{ fontSize: 11, color: s.color, opacity: 0.85 }}>
                            {format(date2, "EEEE, d MMMM", { locale: he })}
                          </div>
                        )}
                        {selected.teacherName && (
                          <div style={{ fontSize: 11, color: 'var(--fd-faint)', marginTop: 2 }}>
                            {selected.teacherName}
                          </div>
                        )}
                        {selected.justified === 1 && (
                          <div style={{ fontSize: 11, color: 'var(--fd-sage)', fontWeight: 600, marginTop: 2 }}>מוצדק</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full list modal */}
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
