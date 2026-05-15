import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { ClockTile } from "../tiles/ClockTile";
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
    <div className="text-center text-gray-400 text-xs mt-2 flex items-center justify-center gap-3">
      <span className="opacity-50">v1.6</span>
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
        {label}
      </span>
    </div>
  );
}

export function DashboardGrid() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 font-sans p-3">

      {/* ── Desktop / Tablet: fixed 8-row grid that fills the viewport ── */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:grid-rows-8 lg:gap-3 lg:h-[calc(100vh-2.5rem)]">

        {/* Row 1-2: top bar */}
        <div className="col-span-3 row-span-2"><ClockTile /></div>
        <div className="col-span-3 row-span-2"><WeatherTile /></div>
        <div className="col-span-6 row-span-3"><CalendarTile /></div>

        {/* Row 3-5: middle */}
        <div className="col-span-3 row-span-3"><BehaviorTile /></div>
        <div className="col-span-3 row-span-3"><TasksTile mode="today" /></div>

        {/* Row 6-8: bottom */}
        <div className="col-span-3 row-span-3"><SchoolTomorrowTile /></div>
        <div className="col-span-3 row-span-3"><EventsBoardTile /></div>
        <div className="col-span-6 row-span-3"><ChuggimTile /></div>
      </div>

      {/* ── Mobile: single column, scrollable ── */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <ClockTile />
          <WeatherTile />
        </div>
        <CalendarTile />
        <div className="grid grid-cols-2 gap-3">
          <TasksTile mode="today" />
          <BehaviorTile />
        </div>
        <SchoolTomorrowTile />
        <EventsBoardTile />
        <ChuggimTile />
      </div>

      <SyncBadge />
    </div>
  );
}
