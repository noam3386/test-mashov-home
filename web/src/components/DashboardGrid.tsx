import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useChildMembers } from "../hooks/useMembers";
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
      <span className="opacity-50">v1.7</span>
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
        {label}
      </span>
    </div>
  );
}

function MemberTabs({
  members,
  selected,
  onSelect,
}: {
  members: { id: string; name: string; color: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (members.length <= 1) return null;
  return (
    <div className="flex gap-1.5 flex-shrink-0">
      {members.map((m) => {
        const active = m.id === selected;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              active
                ? "text-white shadow-sm"
                : "bg-white/60 text-gray-500 hover:bg-white"
            }`}
            style={active ? { backgroundColor: m.color } : {}}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardGrid() {
  const { members, loading: membersLoading } = useChildMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Auto-select first member when loaded
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && members.length > 0) {
      initialized.current = true;
      setSelectedMemberId(members[0].id);
    }
  }, [members]);

  const memberId = selectedMemberId || undefined;

  return (
    <div dir="rtl" className="bg-slate-100 font-sans">

      {/* ── Desktop: fills exactly the viewport, no scroll ── */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:p-3 lg:gap-2">
        {/* Member tabs + sync badge row */}
        <div className="flex items-center justify-between flex-shrink-0 px-1">
          {membersLoading ? (
            <div className="h-7" />
          ) : (
            <MemberTabs
              members={members}
              selected={selectedMemberId}
              onSelect={setSelectedMemberId}
            />
          )}
          <SyncBadge />
        </div>

        {/* Grid takes all remaining space */}
        <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-8 gap-3">
          <div className="col-span-3 row-span-2"><ClockTile /></div>
          <div className="col-span-3 row-span-2"><WeatherTile /></div>
          <div className="col-span-6 row-span-3"><CalendarTile /></div>

          <div className="col-span-3 row-span-3"><BehaviorTile memberId={memberId} /></div>
          <div className="col-span-3 row-span-3"><TasksTile mode="today" /></div>

          <div className="col-span-3 row-span-3"><SchoolTomorrowTile memberId={memberId} /></div>
          <div className="col-span-3 row-span-3"><EventsBoardTile memberId={memberId} /></div>
          <div className="col-span-6 row-span-3"><ChuggimTile /></div>
        </div>
      </div>

      {/* ── Mobile: scrollable ── */}
      <div className="lg:hidden p-3 flex flex-col gap-3">
        {!membersLoading && members.length > 1 && (
          <MemberTabs
            members={members}
            selected={selectedMemberId}
            onSelect={setSelectedMemberId}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <ClockTile />
          <WeatherTile />
        </div>
        <CalendarTile />
        <div className="grid grid-cols-2 gap-3">
          <TasksTile mode="today" />
          <BehaviorTile memberId={memberId} />
        </div>
        <SchoolTomorrowTile memberId={memberId} />
        <EventsBoardTile memberId={memberId} />
        <ChuggimTile />
      </div>
    </div>
  );
}
