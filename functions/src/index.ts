import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { syncStudent } from "./mashov/sync";

initializeApp();

const MASHOV_STUDENT_1_PASSWORD = defineSecret("MASHOV_STUDENT_1_PASSWORD");
const MASHOV_STUDENT_2_PASSWORD = defineSecret("MASHOV_STUDENT_2_PASSWORD");

async function runSync(secrets: { s1: string; s2: string }) {
  const db = getFirestore();

  const configSnap = await db.collection("config").doc("mashov").get();
  const config = configSnap.data();
  if (!config?.students) {
    console.log("No students configured in config/mashov");
    return;
  }

  const students = config.students as Array<{
    memberId: string;
    semel: number;
    username: string;
    passwordSecret: string;
    year: number;
  }>;

  let consecutiveFailures = 0;

  for (const student of students) {
    const password = student.passwordSecret === "MASHOV_STUDENT_1_PASSWORD"
      ? secrets.s1
      : secrets.s2;

    try {
      await syncStudent(student, password);
      console.log(`Synced student ${student.memberId}`);
    } catch (err) {
      console.error(`Failed to sync student ${student.memberId}:`, err);
      consecutiveFailures++;
    }
  }

  await db.collection("config").doc("mashov").update({
    consecutiveFailures,
    lastSyncAt: FieldValue.serverTimestamp(),
  });
}

export const mashovSync = onSchedule(
  {
    schedule: "0 4,6,8,10,12,14,16 * * 0-4",
    timeZone: "Asia/Jerusalem",
    secrets: [MASHOV_STUDENT_1_PASSWORD, MASHOV_STUDENT_2_PASSWORD],
  },
  async () => {
    await runSync({
      s1: MASHOV_STUDENT_1_PASSWORD.value(),
      s2: MASHOV_STUDENT_2_PASSWORD.value(),
    });
  }
);

export const mashovSyncManual = onRequest(
  {
    invoker: "private",
    secrets: [MASHOV_STUDENT_1_PASSWORD, MASHOV_STUDENT_2_PASSWORD],
  },
  async (req, res) => {
    await runSync({
      s1: MASHOV_STUDENT_1_PASSWORD.value(),
      s2: MASHOV_STUDENT_2_PASSWORD.value(),
    });
    res.json({ ok: true, timestamp: new Date().toISOString() });
  }
);
