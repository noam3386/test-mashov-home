import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { syncStudent } from "./mashov/sync";

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

  for (const student of students) {
    try {
      await syncStudent(student, student.password);
      console.log(`✅ Synced student ${student.memberId}`);
      consecutiveFailures = 0;
      syncedCount++;
    } catch (err) {
      console.error(`❌ Failed to sync student ${student.memberId}:`, err);
      consecutiveFailures++;
    }
  }

  await db.collection("config").doc("mashov").update({
    consecutiveFailures,
    lastSyncAt: FieldValue.serverTimestamp(),
  });

  console.log(`Sync complete: ${syncedCount}/${students.length} students, failures: ${consecutiveFailures}`);
}

export const mashovSync = onSchedule(
  {
    schedule: "0 4,6,8,10,12,14,16 * * 0-4",
    timeZone: "Asia/Jerusalem",
  },
  async () => { await runSync(); }
);

export const mashovSyncManual = onRequest(
  { invoker: "private" },
  async (_req, res) => {
    await runSync();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  }
);
