/**
 * Usage: node add-member.js <uid> <name> <role> [options-json]
 * role: parent | child
 * options: {"mashovId":"123456789","mashovSchoolId":123456,"color":"#60a5fa","calendarId":"..."}
 *
 * Example:
 *   node add-member.js uid_parent "אמא" parent '{"color":"#f472b6"}'
 *   node add-member.js uid_child1 "נועם" child '{"mashovId":"123456789","mashovSchoolId":123456}'
 */

import { db } from "./firebase-init.js";
import { FieldValue } from "firebase-admin/firestore";

const [uid, name, role] = process.argv.slice(2);
if (!uid || !name || !role) {
  console.error("Usage: node add-member.js <uid> <name> <role> [options-json]");
  process.exit(1);
}

const opts = process.argv[5] ? JSON.parse(process.argv[5]) : {};

const member = {
  name,
  role,
  color: opts.color ?? (role === "parent" ? "#f472b6" : "#60a5fa"),
  mashovId: opts.mashovId ?? null,
  mashovSchoolId: opts.mashovSchoolId ?? null,
  calendarId: opts.calendarId ?? null,
  createdAt: FieldValue.serverTimestamp(),
};

await db.collection("members").doc(uid).set(member, { merge: true });
console.log(`✅ חבר נוסף: "${name}" (${role}) | UID: ${uid}`);
