import { where, Timestamp, doc, updateDoc } from "firebase/firestore";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { useRealtimeCollection } from "../hooks/useRealtime";
import { useFamilyId } from "../context/FamilyContext";
import { db } from "../firebase";

interface TimetableEntry {
  id: string;
  day: number;
  lesson: number;
  subjectName: string;
  teacherName: string;
  roomNum: string;
}

interface SchoolUpdate {
  id: string;
  type: string;
  subject: string;
  title: string;
  body: string;
  remark?: string;
  eventDate: Timestamp;
  read: boolean;
}

function getTomorrow() {
  return addDays(new Date(), 1);
}

function tomorrowDay() {
  return getTomorrow().getDay(); // 0=Sun … 6=Sat
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function SchoolTomorrowTile({ memberId }: { memberId?: string }) {
  const familyId = useFamilyId();
  const tomorrow = getTomorrow();
  const tomorrowDayNum = tomorrowDay();

  const ttConstraints = memberId
    ? [where("memberId", "==", memberId), where("day", "==", tomorrowDayNum)]
    : [where("day", "==", tomorrowDayNum)];

  const { data: timetableRaw, loading: ttLoading } = useRealtimeCollection<TimetableEntry>(
    `families/${familyId}/timetable`,
    ttConstraints
  );
  const timetableAll = [...timetableRaw].sort((a, b) => a.lesson - b.lesson);

  const sevenDaysAgo  = startOfDay(addDays(new Date(), -7));
  const sevenDaysAhead = startOfDay(addDays(new Date(), 7));

  const suConstraints = memberId
    ? [where("memberId", "==", memberId), where("type", "in", ["homework", "hatamot"])]
    : [where("type", "in", ["homework", "hatamot"])];

  const { data: schoolUpdates, loading: suLoading } = useRealtimeCollection<SchoolUpdate>(
    `families/${familyId}/schoolUpdates`,
    suConstraints
  );

  const homework = [...schoolUpdates]
    .filter(
      (u) =>
        u.type === "homework" &&
        !isBefore(u.eventDate.toDate(), sevenDaysAgo) &&
        isBefore(u.eventDate.toDate(), sevenDaysAhead)
    )
    .sort((a, b) => a.eventDate.toMillis() - b.eventDate.toMillis());
  const hatamot  = schoolUpdates.filter((u) => u.type === "hatamot");
  const doneHw   = homework.filter((u) => u.read);
  const pendingHw= homework.filter((u) => !u.read);

  async function toggleDone(id: string, current: boolean) {
    await updateDoc(doc(db, `families/${familyId}/schoolUpdates`, id), { read: !current });
  }

  const loading = ttLoading || suLoading;

  const isSchoolDay = tomorrowDayNum >= 0 && tomorrowDayNum <= 4; // Sun–Thu
  const tomorrowLabel = `יום ${DAY_NAMES[tomorrowDayNum]} ${format(tomorrow, "d/M", { locale: he })}`;

  return (
    <div className="tile flex flex-col min-h-48">
      <div className="tile-title">📚 מחר בבית הספר</div>
      <div className="text-xs text-gray-400 mb-2">{tomorrowLabel}</div>

      {loading ? <Skeleton /> : (
        <div className="flex-1 overflow-y-auto space-y-3">

          {/* Tomorrow's timetable */}
          {isSchoolDay && timetableAll.length > 0 && (
            <section>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">שיעורים מחר</div>
              <div className="space-y-1">
                {timetableAll.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 text-xs bg-blue-50 rounded-lg px-2.5 py-1.5">
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-blue-200 text-blue-800 font-bold flex items-center justify-center text-xs">
                      {entry.lesson}
                    </span>
                    <span className="font-medium text-blue-900 truncate">{entry.subjectName}</span>
                    {entry.teacherName && (
                      <span className="mr-auto text-blue-400 flex-shrink-0 truncate max-w-24">{entry.teacherName}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {!isSchoolDay && (
            <p className="text-gray-300 text-sm text-center py-4">מחר אין בית ספר 🎉</p>
          )}

          {/* Homework */}
          {homework.length > 0 && (
            <section>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                שיעורי בית
                {doneHw.length > 0 && (
                  <span className="mr-1 text-gray-300 font-normal">({doneHw.length} הושלמו)</span>
                )}
              </div>
              <div className="space-y-1.5">
                {pendingHw.map((hw) => <HomeworkCard key={hw.id} hw={hw} onToggle={toggleDone} />)}
                {doneHw.map((hw) => <HomeworkCard key={hw.id} hw={hw} onToggle={toggleDone} done />)}
              </div>
            </section>
          )}

          {/* Equipment */}
          {hatamot.length > 0 && (
            <section>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">ציוד להביא</div>
              <div className="flex flex-wrap gap-1.5">
                {hatamot.map((item) => (
                  <span key={item.id} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2.5 py-1 font-medium">
                    {item.title}
                    {item.body && <span className="opacity-60"> · {item.body}</span>}
                  </span>
                ))}
              </div>
            </section>
          )}

          {timetableAll.length === 0 && homework.length === 0 && hatamot.length === 0 && (
            <p className="text-gray-300 text-sm text-center mt-6">אין מידע עדיין</p>
          )}
        </div>
      )}
    </div>
  );
}

interface HomeworkCardProps {
  hw: SchoolUpdate;
  done?: boolean;
  onToggle: (id: string, current: boolean) => void;
}

function HomeworkCard({ hw, done = false, onToggle }: HomeworkCardProps) {
  const dueDate = hw.eventDate.toDate();
  const isOverdue = !done && isBefore(dueDate, startOfDay(new Date()));
  const isDueToday = !done && !isOverdue && isBefore(dueDate, startOfDay(addDays(new Date(), 1)));
  const badgeCls = done
    ? "bg-gray-100 text-gray-400"
    : isOverdue
    ? "bg-red-100 text-red-700"
    : isDueToday
    ? "bg-orange-100 text-orange-700"
    : "bg-gray-100 text-gray-600";

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 transition-colors ${done ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"}`}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(hw.id, hw.read)}
          className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            done
              ? "bg-green-400 border-green-400 text-white"
              : "border-gray-300 hover:border-green-400"
          }`}
          title={done ? "סמן כלא הושלם" : "סמן כהושלם"}
        >
          {done && <span className="text-white text-xs leading-none">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-xs font-semibold truncate ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
              {hw.subject}
            </span>
            <span className={`mr-auto flex-shrink-0 text-xs rounded px-1.5 py-0.5 font-medium ${badgeCls}`}>
              {format(dueDate, "d/M", { locale: he })}
            </span>
          </div>
          {hw.body && (
            <p className={`text-xs leading-snug line-clamp-3 ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>
              {hw.body}
            </p>
          )}
          {hw.remark && !done && (
            <p className="text-xs text-gray-400 leading-snug mt-0.5">{hw.remark}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton h-4 w-28 mb-3" />
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-7 w-full" />)}
      <div className="skeleton h-4 w-20 mt-2" />
      <div className="skeleton h-16 w-full" />
    </div>
  );
}
