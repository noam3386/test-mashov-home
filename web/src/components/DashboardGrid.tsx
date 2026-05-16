import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { HeaderStrip } from "./HeaderStrip";
import { CalendarTile } from "../tiles/CalendarTile";
import { TasksTile } from "../tiles/TasksTile";
import { BehaviorTile } from "../tiles/BehaviorTile";
import { HomeworkTile } from "../tiles/HomeworkTile";
import { SchoolTomorrowTile } from "../tiles/SchoolTomorrowTile";
import { ChuggimTile } from "../tiles/ChuggimTile";
import { WeatherTile } from "../tiles/WeatherTile";
import { EventsBoardTile } from "../tiles/EventsBoardTile";

interface CalendarSyncState { status?: string; error?: string; events?: number; serviceAccount?: string; }

function useLastSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [calSync, setCalSync]   = useState<CalendarSyncState>({});
  useEffect(() => {
    const u1 = onSnapshot(doc(db, "config", "mashov"), (snap) => {
      const ts = snap.data()?.lastSyncAt as Timestamp | undefined;
      if (ts) setLastSync(ts.toDate());
    });
    const u2 = onSnapshot(doc(db, "config", "calendarSync"), (snap) => {
      if (snap.exists()) setCalSync(snap.data() as CalendarSyncState);
    });
    return () => { u1(); u2(); };
  }, []);
  return { lastSync, calSync };
}

function SyncBadge() {
  const { lastSync, calSync } = useLastSync();
  const label = lastSync
    ? `עודכן ${lastSync.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} — ${lastSync.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}`
    : "טוען...";
  const calOk = calSync.status === "ok";
  const calErr = calSync.status === "error";
  return (
    <div style={{ color: 'var(--fd-faint)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBlock: 4, flexShrink: 0, flexWrap: 'wrap' }}>
      <span style={{ opacity: 0.5 }}>v2.2</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fd-sage)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        {label}
      </span>
      {calErr && (
        <span style={{ color: 'var(--fd-terra)', fontWeight: 600 }} title={`${calSync.error}\nשתף עם: ${calSync.serviceAccount}`}>
          📅 יומן: שגיאה — {calSync.error?.slice(0, 50)}
        </span>
      )}
      {calOk && calSync.events === 0 && (
        <span style={{ color: 'var(--fd-honey)' }} title={`שתף יומן עם: ${calSync.serviceAccount}`}>
          📅 יומן: 0 אירועים — בדוק שיתוף
        </span>
      )}
    </div>
  );
}

export function DashboardGrid() {
  return (
    <div dir="rtl" style={{ fontFamily: 'var(--fd-font-sans)', color: 'var(--fd-ink)' }}>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex lg:flex-col" style={{
        height: '100vh', padding: 20, gap: 14, boxSizing: 'border-box',
        background: 'var(--fd-bg)',
      }}>
        <HeaderStrip />

        {/* Row 1: Calendar + Weather + Tasks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 1.1fr', gap: 14, height: 248, flexShrink: 0 }}>
          <CalendarTile />
          <WeatherTile />
          <TasksTile mode="today" />
        </div>

        {/* Row 2: Events + SchoolTomorrow + Homework */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 0.95fr', gap: 14, height: 248, flexShrink: 0 }}>
          <EventsBoardTile />
          <SchoolTomorrowTile />
          <HomeworkTile />
        </div>

        {/* Row 3: Attendance (narrow) + Chuggim (wide) */}
        <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 2.4fr', gap: 14, flex: 1, minHeight: 0 }}>
          <BehaviorTile />
          <ChuggimTile />
        </div>

        <SyncBadge />
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col" style={{ padding: 16, gap: 14, background: 'var(--fd-bg)' }}>
        <HeaderStrip />
        <CalendarTile />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <WeatherTile />
          <TasksTile mode="today" />
        </div>
        <EventsBoardTile />
        <SchoolTomorrowTile />
        <HomeworkTile />
        <BehaviorTile />
        <ChuggimTile />
        <SyncBadge />
      </div>
    </div>
  );
}
