import { where, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { useFamilyId } from "../context/FamilyContext";
import { db } from "../firebase";

interface SchoolUpdate {
  id: string;
  title: string;
  body: string;
  teacherName: string;
  eventDate: Timestamp;
  read: boolean;
}

export function MessagesTile() {
  const familyId = useFamilyId();
  const { data: messages, loading } = useRealtimeCollection<SchoolUpdate>(
    `families/${familyId}/schoolUpdates`,
    [where("type", "==", "message"), where("read", "==", false), orderBy("fetchedAt", "desc")]
  );

  async function markRead(id: string) {
    await updateDoc(doc(db, `families/${familyId}/schoolUpdates`, id), { read: true });
  }

  return (
    <div className="tile flex flex-col min-h-40">
      <div className="tile-title">
        ✉️ הודעות
        {messages.length > 0 && (
          <span className="mr-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
            {messages.length}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton />
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
          <span className="text-4xl mb-2">📭</span>
          <p className="text-sm">אין הודעות חדשות</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-2">
          {messages.map((m) => (
            <li
              key={m.id}
              onClick={() => markRead(m.id)}
              className="bg-blue-50 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100"
            >
              <div className="text-sm font-semibold text-blue-900 truncate">{m.title}</div>
              <div className="text-xs text-blue-500 mt-0.5">{m.teacherName}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton h-14 w-full" />
      ))}
    </div>
  );
}
