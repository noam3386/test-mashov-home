/**
 * Seed initial data for development/testing.
 * Usage: node seed.js
 */

import { db } from "./firebase-init.js";
import { FieldValue } from "firebase-admin/firestore";

console.log("🌱 שותל נתוני בסיס...\n");

// Members
await db.collection("members").doc("uid_parent").set({
  name: "הורה",
  role: "parent",
  color: "#f472b6",
  mashovId: null,
  mashovSchoolId: null,
  calendarId: null,
  createdAt: FieldValue.serverTimestamp(),
});
console.log("✅ הוסף חבר: הורה (uid_parent)");

await db.collection("members").doc("uid_child1").set({
  name: "ילד 1",
  role: "child",
  color: "#60a5fa",
  mashovId: null,
  mashovSchoolId: null,
  calendarId: null,
  createdAt: FieldValue.serverTimestamp(),
});
console.log("✅ הוסף חבר: ילד 1 (uid_child1)");

// Tasks
const tasks = [
  { title: "שיעורי בית במתמטיקה", assignedTo: ["uid_child1"], priority: "high", category: "homework" },
  { title: "קניות לסופר", assignedTo: ["uid_parent"], priority: "medium", category: "errand" },
  { title: "טיול משפחתי שבת", assignedTo: ["uid_parent", "uid_child1"], priority: "low", category: "family" },
];

for (const t of tasks) {
  const ref = await db.collection("tasks").add({
    ...t,
    dueDate: new Date(),
    status: "pending",
    recurrence: "none",
    completedAt: null,
    completedBy: null,
    createdBy: "seed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`✅ הוסף משימה: "${t.title}" (${ref.id})`);
}

// Config
await db.collection("config").doc("mashov").set({
  students: [],
  consecutiveFailures: 0,
  lastSyncAt: null,
});
console.log("✅ הוגדר config/mashov");

console.log("\n🎉 הסדינג הסתיים! פתח את Emulator UI בכתובת http://localhost:4000");
