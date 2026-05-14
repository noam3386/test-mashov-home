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
      className="h-screen w-screen bg-gray-100 font-sans grid grid-cols-12 grid-rows-8 gap-3 p-3 overflow-hidden"
    >
      {/* שורה 1-2: שעון | לוח (top) | משימות היום */}
      <div className="col-span-3 row-span-2"><ClockTile /></div>
      <div className="col-span-5 row-span-4"><CalendarTile /></div>
      <div className="col-span-4 row-span-3"><TasksTile mode="today" /></div>

      {/* שורה 3-5: הודעות | לוח (bottom) | ציונים */}
      <div className="col-span-3 row-span-3"><MessagesTile /></div>
      <div className="col-span-4 row-span-3"><GradesTile /></div>

      {/* שורה 5-8: משימות שבוע | חוגים */}
      <div className="col-span-4 row-span-4"><TasksTile mode="week" /></div>
      <div className="col-span-8 row-span-4"><ChuggimTile /></div>
    </main>
  );
}
