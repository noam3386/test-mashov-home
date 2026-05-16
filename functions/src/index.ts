import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { syncStudent } from "./mashov/sync";
import { syncCalendar } from "./lib/calendar";

initializeApp();

interface StudentConfig {
  memberId: string;
  semel: number;
  username: string;
  password: string;
  year: number;
}

async function runSync() {
  const db = getFirestore();

  const configSnap = await db.collection("config").doc("mashov").get();
  const config = configSnap.data();
  if (!config?.students?.length) {
    console.log("No students configured in config/mashov");
    return;
  }

  const students = config.students as StudentConfig[];
  let consecutiveFailures = config.consecutiveFailures ?? 0;
  let syncedCount = 0;

  // Calendar sync runs every day
  try {
    await syncCalendar();
  } catch (err) {
    console.error("❌ Calendar sync failed:", err);
  }

  // Mashov sync — skip Saturday
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  if (day === 6) {
    console.log("⏭️ Mashov: skipping (Shabbat)");
  } else {
    for (const student of students) {
      try {
        await syncStudent(student);
        console.log(`✅ Synced student ${student.memberId}`);
        consecutiveFailures = 0;
        syncedCount++;
      } catch (err) {
        console.error(`❌ Failed to sync student ${student.memberId}:`, err);
        consecutiveFailures++;
      }
    }
  }

  await db.collection("config").doc("mashov").update({
    consecutiveFailures,
    lastSyncAt: FieldValue.serverTimestamp(),
  });

  console.log(`Sync complete: ${syncedCount}/${students.length} students`);
}

// Every hour, every day of the week
export const mashovSync = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Asia/Jerusalem",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => { await runSync(); }
);

export const mashovSyncManual = onRequest(
  { invoker: "private", timeoutSeconds: 300 },
  async (_req, res) => {
    await runSync();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  }
);
