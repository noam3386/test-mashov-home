/**
 * Set up Mashov credentials in Firestore config.
 * Run: node setup-mashov.js
 *
 * This writes to config/mashov — readable only by parents, never by the client.
 * Passwords are stored separately in Firebase Secret Manager (not here).
 *
 * Usage: node setup-mashov.js
 * Then follow the interactive prompts.
 */

import { db } from "./firebase-init.js";
import { FieldValue } from "firebase-admin/firestore";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

console.log("\n🏫 הגדרת חיבור למחוון\n");
console.log("כדי להתחבר למחוון צריך:");
console.log("  • סמל מוסד (school code) — מספר בן 6 ספרות");
console.log("  • שם משתמש — בדרך כלל ת.ז. של התלמיד");
console.log("  • סיסמה — תישמר ב-Firebase Secret Manager (לא כאן)");
console.log("  • שנת לימודים — למשל 2025\n");

const numStudents = parseInt(await ask("כמה תלמידים? (1/2): "), 10);
const students = [];

for (let i = 1; i <= numStudents; i++) {
  console.log(`\n--- תלמיד ${i} ---`);
  const memberId = await ask("memberId (למשל uid_child1): ");
  const semel = parseInt(await ask("סמל מוסד: "), 10);
  const username = await ask("שם משתמש (ת.ז.): ");
  const year = parseInt(await ask("שנת לימודים (למשל 2025): "), 10);
  const secretName = i === 1 ? "MASHOV_STUDENT_1_PASSWORD" : "MASHOV_STUDENT_2_PASSWORD";

  students.push({ memberId, semel, username, year, passwordSecret: secretName });
  console.log(`✅ תלמיד ${i} הוגדר. סיסמה תישמר תחת: ${secretName}`);
}

await db.collection("config").doc("mashov").set({
  students,
  consecutiveFailures: 0,
  lastSyncAt: null,
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log("\n✅ הוגדר בהצלחה ב-Firestore (config/mashov)");
console.log("\n⚠️  עדיין צריך לשמור את הסיסמאות ב-Firebase Secret Manager:");
console.log("   firebase functions:secrets:set MASHOV_STUDENT_1_PASSWORD");
if (numStudents > 1) {
  console.log("   firebase functions:secrets:set MASHOV_STUDENT_2_PASSWORD");
}

rl.close();
