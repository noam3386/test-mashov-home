import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export function ClockTile() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dayName = format(now, "EEEE", { locale: he });
  const dateStr = format(now, "d בMMMM yyyy", { locale: he });
  const timeStr = format(now, "HH:mm:ss");

  return (
    <div className="tile col-span-3 row-span-2 flex flex-col items-center justify-center">
      <div className="text-5xl font-bold tabular-nums">{timeStr}</div>
      <div className="text-xl mt-2 text-slate-300">{dayName}</div>
      <div className="text-sm text-slate-400 mt-1">{dateStr}</div>
    </div>
  );
}
