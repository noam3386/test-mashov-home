/**
 * Usage: node list-messages.js [unread-only]
 * unread-only: true | false (default: true)
 */

import { db } from "./firebase-init.js";

const unreadOnly = process.argv[2] !== "false";

let q = db.collection("schoolUpdates").where("type", "==", "message").orderBy("fetchedAt", "desc").limit(20);
if (unreadOnly) q = q.where("read", "==", false);

const snap = await q.get();

if (snap.empty) {
  console.log(unreadOnly ? "אין הודעות שלא נקראו" : "אין הודעות");
  process.exit(0);
}

console.log(`\n📨 הודעות (${unreadOnly ? "לא נקראו" : "הכל"}) — ${snap.size}:\n`);
snap.docs.forEach((d) => {
  const m = d.data();
  const date = m.eventDate?.toDate?.()?.toLocaleDateString("he-IL") ?? "—";
  console.log(`[${m.read ? "✓" : "●"}] ${m.title} | מ: ${m.teacherName} | ${date}`);
});
