/**
 * Usage: node add-task.js <title> [options]
 * Options (as JSON in second arg): {"assignedTo":["uid"],"priority":"high","category":"homework","dueDate":"2025-05-15"}
 *
 * Examples:
 *   node add-task.js "שיעורי בית במתמטיקה"
 *   node add-task.js "קניות" '{"priority":"high","dueDate":"2025-05-15","assignedTo":["uid_parent"]}'
 */

import { db } from "./firebase-init.js";
import { FieldValue } from "firebase-admin/firestore";

const title = process.argv[2];
if (!title) {
  console.error("Usage: node add-task.js <title> [options-json]");
  process.exit(1);
}

const opts = process.argv[3] ? JSON.parse(process.argv[3]) : {};

const task = {
  title,
  assignedTo: opts.assignedTo ?? [],
  dueDate: opts.dueDate ? new Date(opts.dueDate) : new Date(),
  status: "pending",
  priority: opts.priority ?? "medium",
  category: opts.category ?? "family",
  recurrence: opts.recurrence ?? "none",
  completedAt: null,
  completedBy: null,
  createdBy: "claude-admin",
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
};

const ref = await db.collection("tasks").add(task);
console.log(`✅ משימה נוספה: "${title}" (ID: ${ref.id})`);
