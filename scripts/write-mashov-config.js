/**
 * Writes Mashov credentials directly to config/mashov in Firestore.
 * Protected by security rules — client cannot read this document.
 * Only Firebase Admin SDK (Cloud Functions) accesses it.
 */

import { db } from "./firebase-init.js";
import { FieldValue } from "firebase-admin/firestore";

const config = {
  students: [
    {
      memberId: "uid_aviv",
      semel: 482604,
      username: "344987276",
      password: "aviv2704",
      year: 2026,
    }
  ],
  consecutiveFailures: 0,
  lastSyncAt: null,
  updatedAt: FieldValue.serverTimestamp(),
};

await db.collection("config").doc("mashov").set(config);
console.log("✅ הוגדר config/mashov עם פרטי אביב");
console.log("   memberId: uid_aviv | semel: 482604 | user: 344987276");
