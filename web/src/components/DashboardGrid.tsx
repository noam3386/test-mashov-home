import { ClockTile } from "../tiles/ClockTile";
import { CalendarTile } from "../tiles/CalendarTile";
import { TasksTile } from "../tiles/TasksTile";
import { GradesTile } from "../tiles/GradesTile";
import { MessagesTile } from "../tiles/MessagesTile";
import { ChuggimTile } from "../tiles/ChuggimTile";

export function DashboardGrid() {
  return (
    <main
      dir="rtl"
      className="h-screen w-screen bg-slate-900 text-white font-sans grid grid-cols-12 grid-rows-8 gap-2 p-2 overflow-hidden"
    >
      {/* Row 1-2: Clock | Calendar (top) | Tasks Today */}
      <ClockTile />
      <CalendarTile />
      <TasksTile mode="today" />

      {/* Row 3-5: Messages | Calendar (bottom continued) | Grades */}
      <MessagesTile />
      <GradesTile />

      {/* Row 5-8: Tasks Week | Chugim */}
      <TasksTile mode="week" />
      <ChuggimTile />
    </main>
  );
}
