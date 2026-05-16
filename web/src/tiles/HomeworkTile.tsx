import { useState } from "react";
import { where, Timestamp } from "firebase/firestore";
import { format, addDays, subDays, isBefore, isAfter, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { useHomeworkDone } from "../hooks/useHomeworkDone";
import { CardHead } from "../components/CardHead";

interface SchoolUpdate {
  id: string;
  type: string;
  subject: string;
  title: string;
  body: string;
  eventDate: Timestamp;
  read: boolean;
}

export function HomeworkTile() {
  const [showArchive, setShowArchive] = useState(false);
  const { doneIds, toggle } = useHomeworkDone();

  const oneWeekAgo = startOfDay(subDays(new Date(), 7));
  const sevenAhead = startOfDay(addDays(new Date(), 7));

  const { data: hwRaw } = useRealtimeCollection<SchoolUpdate>(
    "schoolUpdates", [where("type", "==", "homework")]
  );

  const homework = hwRaw
    .filter(u => !doneIds.has(u.id) && isAfter(u.eventDate.toDate(), oneWeekAgo) && isBefore(u.eventDate.toDate(), sevenAhead))
    .sort((a, b) => a.eventDate.toMillis() - b.eventDate.toMillis());

  const archived = hwRaw
    .filter(u => doneIds.has(u.id))
    .sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis())
    .slice(0, 30);

  return (
    <>
      <div className="tile flex flex-col" style={{ height: '100%' }}>
        <CardHead he="שיעורי בית · אביב" en="HOMEWORK" right={
          archived.length > 0 ? (
            <button onClick={() => setShowArchive(true)}
              style={{ fontSize: 11, color: 'var(--fd-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              ארכיון ({archived.length})
            </button>
          ) : undefined
        } />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {homework.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--fd-faint)' }}>
              אין שיעורי בית פתוחים ✅
            </div>
          ) : homework.map(hw => (
            <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'var(--fd-task-warm)', border: '1px solid var(--fd-honey-soft)' }}>
              <button onClick={() => toggle(hw.id)}
                style={{ width: 18, height: 18, borderRadius: 6, border: '1.5px solid var(--fd-faint)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} />
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

      {showArchive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowArchive(false)}>
          <div style={{ background: 'var(--fd-card)', borderRadius: 24, width: '100%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--fd-divider)' }}>
              <span style={{ fontWeight: 700, color: 'var(--fd-ink)' }}>ארכיון שיעורי בית ({archived.length})</span>
              <button onClick={() => setShowArchive(false)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--fd-divider)', border: 'none', cursor: 'pointer', color: 'var(--fd-muted)', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archived.map(hw => (
                <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'var(--fd-divider)', opacity: 0.7 }}>
                  <button onClick={() => toggle(hw.id)}
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
    </>
  );
}
