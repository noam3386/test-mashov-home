import { useState } from "react";
import { where, Timestamp } from "firebase/firestore";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, format, isToday, isSameMonth,
} from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  category: string;
  allDay: boolean;
}

interface TimetableEntry {
  id: string;
  day: number;
  lesson: number;
  subjectName: string;
  teacherName: string;
}

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function chipStyle(kind: string): { bg: string; fg: string } {
  switch (kind) {
    case 'school':   return { bg: 'var(--fd-school-bg)', fg: 'var(--fd-school-fg)' };
    case 'birthday': return { bg: 'var(--fd-sage-soft)',  fg: 'var(--fd-sage)'       };
    case 'family':   return { bg: 'var(--fd-honey-soft)', fg: 'var(--fd-honey)'      };
    case 'chug':     return { bg: 'var(--fd-forest-soft)',fg: 'var(--fd-forest)'     };
    default:         return { bg: 'var(--fd-divider)',     fg: 'var(--fd-muted)'     };
  }
}

export function CalendarTile() {
  const [viewMonth, setViewMonth]     = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvs, setSelectedEvs]   = useState<ScheduleEvent[]>([]);
  const [selectedTT, setSelectedTT]     = useState<TimetableEntry[]>([]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: events } = useRealtimeCollection<ScheduleEvent>("schedule", [
    where("startTime", ">=", Timestamp.fromDate(calStart)),
    where("startTime", "<=", Timestamp.fromDate(calEnd)),
  ]);
  const { data: timetableAll } = useRealtimeCollection<TimetableEntry>("timetable", []);

  const byDay = new Map<string, ScheduleEvent[]>();
  events.forEach(ev => {
    const key = format(ev.startTime.toDate(), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  });

  const ttByDow = new Map<number, TimetableEntry[]>();
  timetableAll.forEach(e => {
    if (!ttByDow.has(e.day)) ttByDow.set(e.day, []);
    ttByDow.get(e.day)!.push(e);
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function openDay(day: Date, dayEvs: ScheduleEvent[], tt: TimetableEntry[]) {
    if (dayEvs.length === 0 && tt.length === 0) return;
    setSelectedDate(day);
    setSelectedEvs(dayEvs);
    setSelectedTT([...tt].sort((a, b) => a.lesson - b.lesson));
  }

  const monthHe = format(viewMonth, "MMMM yyyy", { locale: he });
  const monthEn = format(viewMonth, "MMMM yyyy").toUpperCase();

  return (
    <div className="tile flex flex-col" style={{ height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="card-title">{monthHe}</div>
          <div className="card-subtitle">{monthEn}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setViewMonth(m => addMonths(m, -1))}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fd-muted)', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <button onClick={() => setViewMonth(m => addMonths(m, 1))}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fd-muted)', cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>
      </div>

      {/* Day name row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--fd-faint)', fontWeight: 600, paddingBottom: 4, letterSpacing: '0.02em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
            {week.map(day => {
              const key    = format(day, "yyyy-MM-dd");
              const dayEvs = byDay.get(key) ?? [];
              const tt     = ttByDow.get(day.getDay()) ?? [];
              const today  = isToday(day);
              const inMonth= isSameMonth(day, viewMonth);
              const clickable = dayEvs.length > 0 || tt.length > 0;

              return (
                <div key={key}
                  onClick={() => openDay(day, dayEvs, tt)}
                  style={{
                    borderRadius: 8, padding: '4px 3px',
                    background: today ? 'var(--fd-terra-soft)' : 'transparent',
                    border: today ? '1px solid var(--fd-terra)' : '1px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    minHeight: 32, cursor: clickable ? 'pointer' : 'default',
                  }}>
                  <div style={{
                    fontSize: 13, fontWeight: today ? 700 : 500, lineHeight: 1,
                    color: today ? 'var(--fd-terra)' : inMonth ? 'var(--fd-ink)' : 'var(--fd-faint)',
                  }}>
                    {format(day, 'd')}
                  </div>

                  {/* School chip */}
                  {tt.length > 0 && inMonth && (() => {
                    const c = chipStyle('school');
                    return (
                      <div style={{ background: c.bg, color: c.fg, fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tt.length} שיעורים
                      </div>
                    );
                  })()}

                  {/* Event chips */}
                  {dayEvs.slice(0, tt.length > 0 ? 1 : 2).map(ev => {
                    const c = chipStyle(ev.category);
                    return (
                      <div key={ev.id} style={{ background: c.bg, color: c.fg, fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(42,31,23,0.3)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 16 }}
          onClick={() => setSelectedDate(null)}>
          <div style={{ background: 'var(--fd-card)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 280, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fd-ink)' }}>
                {format(selectedDate, "EEEE, d MMMM", { locale: he })}
              </span>
              <button onClick={() => setSelectedDate(null)}
                style={{ color: 'var(--fd-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
              {selectedTT.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fd-faint)', letterSpacing: '0.1em', marginBottom: 8 }}>מערכת שעות</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedTT.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fd-school-bg)', borderRadius: 10, padding: '6px 10px' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--fd-school-fg)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {e.lesson}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fd-school-fg)' }}>{e.subjectName}</span>
                        {e.teacherName && <span style={{ fontSize: 11, color: 'var(--fd-faint)', marginInlineStart: 'auto' }}>{e.teacherName}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvs.length > 0 && (
                <div>
                  {selectedTT.length > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fd-faint)', letterSpacing: '0.1em', marginBottom: 8 }}>אירועים</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedEvs.map(ev => {
                      const c = chipStyle(ev.category);
                      const start = ev.startTime.toDate();
                      const end   = ev.endTime?.toDate?.();
                      return (
                        <div key={ev.id} style={{ background: c.bg, borderRadius: 12, padding: '10px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: c.fg }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: c.fg, opacity: 0.7, marginTop: 2 }}>
                            {ev.allDay ? 'כל היום' : end ? `${format(start,'HH:mm')} – ${format(end,'HH:mm')}` : format(start,'HH:mm')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
