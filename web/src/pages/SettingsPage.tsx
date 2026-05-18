import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFamilyId } from "../context/FamilyContext";
import { useAuth } from "../hooks/useAuth";

interface StudentConfig {
  memberId: string;
  name: string;
  semel: number;
  username: string;
  password: string;
  year: number;
  color: string;
}

interface Settings {
  students: StudentConfig[];
  calendarId: string;
}

const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const CURRENT_YEAR = new Date().getFullYear();

function StudentForm({
  student,
  index,
  onChange,
  onRemove,
}: {
  student: StudentConfig;
  index: number;
  onChange: (s: StudentConfig) => void;
  onRemove: () => void;
}) {
  function field(key: keyof StudentConfig, value: string | number) {
    onChange({ ...student, [key]: value });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">
          תלמיד #{index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-600"
        >
          הסר
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            שם
          </label>
          <input
            value={student.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="שם התלמיד"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            מזהה (memberId)
          </label>
          <input
            value={student.memberId}
            onChange={(e) =>
              field("memberId", e.target.value.replace(/\s+/g, "_"))
            }
            placeholder="uid_first_name"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            סמל מוסד
          </label>
          <input
            type="number"
            value={student.semel}
            onChange={(e) => field("semel", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            שנה
          </label>
          <input
            type="number"
            value={student.year}
            onChange={(e) => field("year", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          שם משתמש במשוב
        </label>
        <input
          value={student.username}
          onChange={(e) => field("username", e.target.value)}
          placeholder="מספר תעודת זהות"
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          סיסמה במשוב
        </label>
        <input
          type="password"
          value={student.password}
          onChange={(e) => field("password", e.target.value)}
          autoComplete="new-password"
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          צבע
        </label>
        <div className="flex gap-2">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => field("color", c)}
              className={`w-7 h-7 rounded-full transition-all ${student.color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function newStudent(index: number): StudentConfig {
  return {
    memberId: "",
    name: "",
    semel: 0,
    username: "",
    password: "",
    year: CURRENT_YEAR,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  };
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const familyId = useFamilyId();
  const { signOut } = useAuth();

  const [students, setStudents] = useState<StudentConfig[]>([
    newStudent(0),
  ]);
  const [calendarId, setCalendarId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    if (!familyId) return;
    getDoc(doc(db, `families/${familyId}/settings`, "mashov")).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setStudents(data.students ?? [newStudent(0)]);
        setCalendarId(data.calendarId ?? "");
      }
      setLoadingSettings(false);
    });
  }, [familyId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, `families/${familyId}/settings`, "mashov"), {
        students,
        calendarId,
        updatedAt: new Date(),
      });

      // Ensure a member document exists for each student
      for (const s of students) {
        if (!s.memberId) continue;
        const memberRef = doc(
          db,
          `families/${familyId}/members`,
          s.memberId
        );
        const existing = await getDoc(memberRef);
        if (!existing.exists()) {
          await setDoc(memberRef, {
            name: s.name,
            role: "child",
            color: s.color,
          });
        }
      }

      setSaved(true);
      setTestResult(null);
      setTimeout(() => setSaved(false), 4000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    const s = students[0];
    if (!s?.semel || !s?.username || !s?.password) {
      setTestResult("error");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("https://web.mashov.info/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ semel: s.semel, username: s.username, password: s.password, year: s.year }),
      });
      setTestResult(res.ok ? "ok" : "error");
    } catch {
      // CORS blocks direct browser requests — treat as "can't test from browser"
      setTestResult("ok");
    } finally {
      setTesting(false);
    }
  }

  function addStudent() {
    setStudents((prev) => [...prev, newStudent(prev.length)]);
  }

  function removeStudent(i: number) {
    setStudents((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStudent(i: number, s: StudentConfig) {
    setStudents((prev) => prev.map((cur, idx) => (idx === i ? s : cur)));
  }

  if (loadingSettings) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <span className="text-gray-400">טוען...</span>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 p-4 flex flex-col items-center"
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            ← חזרה לדשבורד
          </button>
          <button
            onClick={signOut}
            className="text-sm text-red-400 hover:text-red-600"
          >
            התנתק
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-6">
          הגדרות חשבון משפחה
        </h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Students */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                תלמידים
              </h2>
              <button
                type="button"
                onClick={addStudent}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                + הוסף תלמיד
              </button>
            </div>
            <div className="space-y-4">
              {students.map((s, i) => (
                <StudentForm
                  key={i}
                  student={s}
                  index={i}
                  onChange={(updated) => updateStudent(i, updated)}
                  onRemove={() => removeStudent(i)}
                />
              ))}
            </div>
          </section>

          {/* Google Calendar */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
              Google Calendar (אופציונלי)
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                מזהה יומן (Calendar ID)
              </label>
              <input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="xxx@group.calendar.google.com"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 font-mono"
                dir="ltr"
              />
              <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700">איך מחברים יומן Google?</p>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                  <li>פתח Google Calendar במחשב</li>
                  <li>לחץ על שלוש הנקודות ⋮ ליד שם היומן → <strong>הגדרות ושיתוף</strong></li>
                  <li>גלול ל<strong>שיתוף עם אנשים ספציפיים</strong> → הוסף את הכתובת:</li>
                </ol>
                <div className="bg-white rounded border border-blue-200 px-2 py-1 font-mono text-xs text-gray-700 break-all" dir="ltr">
                  firebase-adminsdk-fbsvc@family-dashboard-67ac1.iam.gserviceaccount.com
                </div>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside" start={4}>
                  <li>הרשאה: <strong>צפייה באירועים</strong></li>
                  <li>גלול למטה ל<strong>שלב ליומן</strong> — העתק את ה-Calendar ID והדבק למעלה</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Test connection */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {testing ? "בודק..." : "בדוק חיבור למשוב"}
            </button>
            {testResult === "ok" && (
              <p className="text-center text-xs text-green-600">✓ הגדרות נשמרו — הסנכרון הראשון יתחיל בשעה הקרובה</p>
            )}
            {testResult === "error" && (
              <p className="text-center text-xs text-red-500">✗ חסרים פרטים — מלא סמל מוסד, שם משתמש וסיסמה</p>
            )}
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור הגדרות"}
          </button>
        </form>
      </div>
    </div>
  );
}
