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
    <div className="text-center text-gray-300 text-xs mt-2 flex items-center justify-center gap-3">
      <span>v1.5</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        {label}
      </span>
    </div>
  );
}

export function DashboardGrid() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 font-sans p-3">

      {/* Tablet landscape: 12-col fixed grid */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:grid-rows-8 lg:gap-3 lg:h-[calc(100vh-24px)]">
        <div className="col-span-3 row-span-2"><ClockTile /></div>
        <div className="col-span-3 row-span-2"><WeatherTile /></div>
        <div className="col-span-6 row-span-2"><CalendarTile /></div>

        <div className="col-span-3 row-span-3"><BehaviorTile /></div>
        <div className="col-span-3 row-span-3"><TasksTile mode="today" /></div>
        <div className="col-span-3 row-span-3"><SchoolTomorrowTile /></div>
        <div className="col-span-3 row-span-3"><TasksTile mode="week" /></div>

        <div className="col-span-12 row-span-3"><ChuggimTile /></div>
      </div>

      {/* Mobile: single column, scrollable */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <ClockTile />
          <WeatherTile />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TasksTile mode="today" />
          <BehaviorTile />
        </div>
        <CalendarTile />
        <SchoolTomorrowTile />
        <TasksTile mode="week" />
        <ChuggimTile />
      </div>

      <SyncBadge />
    </div>
  );
}
