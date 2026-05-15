import { where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";
import { CardHead } from "../components/CardHead";
import { Avatar } from "../components/Avatar";
import { memberOf } from "../family";

interface TimetableEntry {
  id: string;
  day: number;
  lesson: number;
  subjectName: string;
  teacherName: string;
}

interface SchoolUpdate {
  id: string;
  type: string;
  subject: string;
  title: string;
  body: string;
  remark?: string;
  eventDate: Timestamp;
  read: boolean;
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function SchoolTomorrowTile() {
  const tomorrow       = addDays(new Date(), 1);
  const tomorrowDayNum = tomorrow.getDay();
  const isSchoolDay    = tomorrowDayNum >= 0 && tomorrowDayNum <= 4;

  const { data: timetableRaw, loading: ttLoading } = useRealtimeCollection<TimetableEntry>(
    "timetable", [where("day", "==", tomorrowDayNum)]
  );
  const timetable = [...timetableRaw].sort((a, b) => a.lesson - b.lesson);

  const { data: schoolUpdates, loading: suLoading } = useRealtimeCollection<SchoolUpdate>(
    "schoolUpdates", [where("type", "in", ["homework", "hatamot"])]
  );

  const sevenAhead = startOfDay(addDays(new Date(), 7));
  const pendingHw  = schoolUpdates.filter(u =>
    u.type === "homework" && !u.read && isBefore(u.eventDate.toDate(), sevenAhead)
  );

  const hwBySubject = new Map<string, SchoolUpdate>();
  for (const hw of pendingHw) hwBySubject.set(hw.subject?.trim().toLowerCase(), hw);

  const hatamot = schoolUpdates.filter(u => u.type === "hatamot");

  async function toggleHw(id: string, current: boolean) {
    await updateDoc(doc(db, "schoolUpdates", id), { read: !current });
  }

  const loading = ttLoading || suLoading;
  const aviv    = memberOf('aviv');
  const tomorrowLabel = `יום ${DAY_NAMES[tomorrowDayNum]} · ${format(tomorrow, "d בMMMM", { locale: he })}`;

  return (
    <div className="tile flex flex-col" style={{ height: '100%' }}>
      <CardHead
        he={`מחר בבית הספר · אביב`}
        en={`TOMORROW · AVIV`}
        right={aviv ? <Avatar member={aviv} size={32} /> : undefined}
      />
      <div style={{ fontSize: 12, color: 'var(--fd-muted)', marginBottom: 12, fontWeight: 500 }}>
        {tomorrowLabel}
      </div>

      {loading ? <Skeleton /> : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>

          {!isSchoolDay && pendingHw.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fd-faint)', fontSize: 13 }}>
              מחר אין בית ספר 🎉
            </div>
          )}

          {!isSchoolDay && pendingHw.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--fd-faint)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 2 }}>שיעורי בית פתוחים</div>
              {pendingHw.map(hw => (
                <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'var(--fd-task-warm)', border: '1px solid var(--fd-honey-soft)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fd-ink)' }}>{hw.subject}</div>
                    {hw.body && <div style={{ fontSize: 11.5, color: 'var(--fd-muted)', marginTop: 1 }}>{hw.body}</div>}
                  </div>
                  <button onClick={() => toggleHw(hw.id, hw.read)}
                    style={{ width: 18, height: 18, borderRadius: 6, border: '1.5px solid var(--fd-faint)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {hw.read ? <span style={{ color: 'var(--fd-sage)', fontSize: 12 }}>✓</span> : null}
                  </button>
                </div>
              ))}
            </div>
          )}

          {isSchoolDay && timetable.map(entry => {
            const hw = hwBySubject.get(entry.subjectName?.trim().toLowerCase());
            return (
              <div key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 12,
                  background: hw ? 'var(--fd-task-warm)' : 'transparent',
                  border: hw ? '1px solid var(--fd-honey-soft)' : '1px solid transparent',
                }}>
                {/* Period badge */}
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: hw ? 'var(--fd-honey)' : 'var(--fd-divider)',
                  color: hw ? '#fff' : 'var(--fd-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>
                  {entry.lesson}
                </div>

                {/* Subject */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fd-ink)' }}>{entry.subjectName}</div>
                  {hw?.body && (
                    <div style={{ fontSize: 11.5, color: 'var(--fd-muted)', marginTop: 1 }}>{hw.body}</div>
                  )}
                  {entry.teacherName && !hw && (
                    <div style={{ fontSize: 11.5, color: 'var(--fd-faint)', marginTop: 1 }}>{entry.teacherName}</div>
                  )}
                </div>

                {/* Homework chip or done toggle */}
                {hw ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleHw(hw.id, hw.read)}
                      style={{
                        width: 18, height: 18, borderRadius: 6, border: `1.5px solid var(--fd-faint)`,
                        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {hw.read ? <span style={{ color: 'var(--fd-sage)', fontSize: 12 }}>✓</span> : null}
                    </button>
                    <span style={{ background: 'var(--fd-terra-soft)', color: 'var(--fd-terra)', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6 }}>
                      שיעורי בית
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--fd-faint)', letterSpacing: '0.1em', fontWeight: 600 }}>
                    {entry.subjectName?.toUpperCase().slice(0, 3)}
                  </span>
                )}
              </div>
            );
          })}

          {/* Hatamot */}
          {hatamot.length > 0 && (
            <div style={{ paddingTop: 8, borderTop: '1px solid var(--fd-divider)' }}>
              <div style={{ fontSize: 10, color: 'var(--fd-faint)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>ציוד להביא</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {hatamot.map(item => (
                  <span key={item.id} style={{ fontSize: 11.5, background: 'var(--fd-honey-soft)', color: 'var(--fd-honey)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                    {item.title}{item.body ? ` · ${item.body}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isSchoolDay && timetable.length === 0 && pendingHw.length === 0 && hatamot.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fd-faint)', fontSize: 13 }}>
              אין מידע עדיין
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 44, borderRadius: 12 }} />
      ))}
    </div>
  );
}
