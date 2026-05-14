import { db } from "./firebase-init.js";

const snap = await db.collection("members").get();

if (snap.empty) {
  console.log("אין חברי משפחה רשומים עדיין");
  process.exit(0);
}

console.log("\n👨‍👩‍👧‍👦 חברי המשפחה:\n");
snap.docs.forEach((d) => {
  const m = d.data();
  console.log(`[${d.id}] ${m.name} | ${m.role} | מחוון: ${m.mashovId ?? "—"}`);
});
