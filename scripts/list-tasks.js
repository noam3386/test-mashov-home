/**
 * Usage: node list-tasks.js [status]
 * status: pending | done | all (default: pending)
 */

import { db } from "./firebase-init.js";

const statusFilter = process.argv[2] ?? "pending";

let q = db.collection("tasks");
if (statusFilter !== "all") q = q.where("status", "==", statusFilter);

const snap = await q.orderBy("dueDate", "asc").get();

if (snap.empty) {
  console.log(`אין משימות (${statusFilter})`);
  process.exit(0);
}

console.log(`\n📋 משימות (${statusFilter}) — ${snap.size} סה"כ:\n`);
snap.docs.forEach((d) => {
  const t = d.data();
  const due = t.dueDate?.toDate?.()?.toLocaleDateString("he-IL") ?? "—";
  const priority = { high: "🔴", medium: "🟡", low: "🟢" }[t.priority] ?? "⚪";
  console.log(`${priority} [${d.id.slice(0, 8)}] ${t.title} | תאריך: ${due} | ${t.status}`);
});
