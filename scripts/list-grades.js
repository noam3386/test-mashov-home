/**
 * Usage: node list-grades.js [memberId] [limit]
 * Default: all members, last 10 grades
 */

import { db } from "./firebase-init.js";

const memberFilter = process.argv[2];
const lim = parseInt(process.argv[3] ?? "10", 10);

let q = db.collection("schoolUpdates").where("type", "==", "grade").orderBy("eventDate", "desc").limit(lim);
if (memberFilter) q = q.where("memberId", "==", memberFilter);

const snap = await q.get();

if (snap.empty) {
  console.log("אין ציונים עדיין");
  process.exit(0);
}

console.log(`\n📊 ציונים אחרונים (${snap.size}):\n`);
snap.docs.forEach((d) => {
  const g = d.data();
  const pct = g.grade != null && g.maxGrade ? Math.round((g.grade / g.maxGrade) * 100) : null;
  const bar = pct != null ? (pct >= 85 ? "✅" : pct >= 60 ? "🟡" : "❌") : "—";
  const date = g.eventDate?.toDate?.()?.toLocaleDateString("he-IL") ?? "—";
  console.log(`${bar} ${g.subject} | ${g.title} | ${g.grade}/${g.maxGrade} (${pct}%) | ${date}`);
});
