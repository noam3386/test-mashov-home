import { ClockTile } from "../tiles/ClockTile";
import { CalendarTile } from "../tiles/CalendarTile";
import { TasksTile } from "../tiles/TasksTile";
import { GradesTile } from "../tiles/GradesTile";
import { MessagesTile } from "../tiles/MessagesTile";
import { ChuggimTile } from "../tiles/ChuggimTile";

export function DashboardGrid() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 font-sans p-3">

      {/* Tablet landscape: 12-col fixed grid */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:grid-rows-8 lg:gap-3 lg:h-[calc(100vh-24px)]">
        <div className="col-span-3 row-span-2"><ClockTile /></div>
        <div className="col-span-5 row-span-4"><CalendarTile /></div>
        <div className="col-span-4 row-span-3"><TasksTile mode="today" /></div>
        <div className="col-span-3 row-span-3"><MessagesTile /></div>
        <div className="col-span-4 row-span-3"><GradesTile /></div>
        <div className="col-span-4 row-span-4"><TasksTile mode="week" /></div>
        <div className="col-span-8 row-span-4"><ChuggimTile /></div>
      </div>

      {/* Mobile: single column, scrollable */}
      <div className="lg:hidden flex flex-col gap-3">
        <ClockTile />
        <div className="grid grid-cols-2 gap-3">
          <TasksTile mode="today" />
          <MessagesTile />
        </div>
        <CalendarTile />
        <GradesTile />
        <TasksTile mode="week" />
        <ChuggimTile />
      </div>
    </div>
  );
}
