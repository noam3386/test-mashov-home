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
    <div className="tile flex flex-col items-center justify-center py-6 bg-gradient-to-br from-blue-500 to-indigo-600 border-0">
      <div className="text-5xl font-bold tabular-nums text-white tracking-tight">{timeStr}</div>
      <div className="text-lg mt-2 text-blue-100 font-medium">{dayName}</div>
      <div className="text-sm text-blue-200 mt-1">{dateStr}</div>
    </div>
  );
}
