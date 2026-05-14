import { where, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { db } from "../firebase";

interface SchoolUpdate {
  id: string;
  type: string;
  title: string;
  body: string;
  teacherName: string;
  eventDate: Timestamp;
  read: boolean;
}

export function MessagesTile() {
  const { data: messages, loading } = useRealtimeCollection<SchoolUpdate>(
    "schoolUpdates",
    [where("type", "==", "message"), where("read", "==", false), orderBy("fetchedAt", "desc")]
  );

  async function markRead(id: string) {
    await updateDoc(doc(db, "schoolUpdates", id), { read: true });
  }

  return (
    <div className="tile col-span-3 row-span-3 flex flex-col overflow-hidden">
      <h2 className="tile-title">
        הודעות
        {messages.length > 0 && (
          <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
            {messages.length}
          </span>
        )}
      </h2>
      {loading ? (
        <Skeleton />
      ) : messages.length === 0 ? (
        <p className="text-slate-400 text-sm mt-2">אין הודעות חדשות</p>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-2 mt-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className="text-sm bg-slate-700 rounded p-2 cursor-pointer hover:bg-slate-600"
              onClick={() => markRead(m.id)}
            >
              <div className="font-medium truncate">{m.title}</div>
              <div className="text-slate-400 text-xs">{m.teacherName}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 mt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
      ))}
    </div>
  );
}
