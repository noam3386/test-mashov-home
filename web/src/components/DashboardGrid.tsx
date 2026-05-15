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
    <div className="text-center text-gray-400 text-xs flex items-center justify-center gap-3 py-1 flex-shrink-0">
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
    <div dir="rtl" className="bg-slate-100 font-sans">

      {/* ── Desktop: fills exactly the viewport, no scroll ── */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:p-3 lg:gap-2">
        {/* Grid takes all remaining space */}
        <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-8 gap-3">
          <div className="col-span-3 row-span-2"><ClockTile /></div>
          <div className="col-span-3 row-span-2"><WeatherTile /></div>
          <div className="col-span-6 row-span-3"><CalendarTile /></div>

          <div className="col-span-3 row-span-3"><BehaviorTile /></div>
          <div className="col-span-3 row-span-3"><TasksTile mode="today" /></div>

          <div className="col-span-3 row-span-3"><SchoolTomorrowTile /></div>
          <div className="col-span-3 row-span-3"><EventsBoardTile /></div>
          <div className="col-span-6 row-span-3"><ChuggimTile /></div>
        </div>
        <SyncBadge />
      </div>

      {/* ── Mobile: scrollable ── */}
      <div className="lg:hidden p-3 flex flex-col gap-3">
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
    </div>
  );
}
