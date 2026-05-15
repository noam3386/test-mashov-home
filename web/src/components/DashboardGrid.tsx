import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { HeaderStrip } from "./HeaderStrip";
import { CalendarTile } from "../tiles/CalendarTile";
import { TasksTile } from "../tiles/TasksTile";
import { BehaviorTile } from "../tiles/BehaviorTile";
import { SchoolTomorrowTile } from "../tiles/SchoolTomorrowTile";
import { ChuggimTile } from "../tiles/ChuggimTile";
import { WeatherTile } from "../tiles/WeatherTile";
import { EventsBoardTile } from "../tiles/EventsBoardTile";

function useLastSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => {
    return onSnapshot(doc(db, "config", "mashov"), (snap) => {
      const ts = snap.data()?.lastSyncAt as Timestamp | undefined;
      if (ts) setLastSync(ts.toDate());
    });
  }, []);
  return lastSync;
}

function SyncBadge() {
  const lastSync = useLastSync();
  const label = lastSync
    ? `עודכן ${lastSync.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} — ${lastSync.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}`
    : "טוען...";
  return (
    <div style={{
      textAlign: 'center', color: 'var(--fd-faint)', fontSize: 11,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, paddingBlock: 4, flexShrink: 0,
    }}>
      <span style={{ opacity: 0.5 }}>v1.7</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fd-sage)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        {label}
      </span>
    </div>
  );
}

export function DashboardGrid() {
  return (
    <div dir="rtl" style={{ fontFamily: 'var(--fd-font-sans)', color: 'var(--fd-ink)' }}>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex lg:flex-col" style={{
        height: '100vh', padding: 28, gap: 18, boxSizing: 'border-box',
        background: 'var(--fd-bg)',
      }}>
        <HeaderStrip />

        {/* Row 1: Calendar + Weather + Tasks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 1.1fr', gap: 16, height: 290, flexShrink: 0 }}>
          <CalendarTile />
          <WeatherTile />
          <TasksTile mode="today" />
        </div>

        {/* Row 2: Events + SchoolTomorrow + Behavior */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 0.95fr', gap: 16, height: 290, flexShrink: 0 }}>
          <EventsBoardTile />
          <SchoolTomorrowTile />
          <BehaviorTile />
        </div>

        {/* Row 3: Chuggim */}
        <div style={{ flex: 1, minHeight: 0 }}>
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
        <BehaviorTile />
        <ChuggimTile />
        <SyncBadge />
      </div>
    </div>
  );
}
