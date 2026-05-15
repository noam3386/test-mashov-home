/**
 * One-time script: mark all homework older than 2 weeks as read=true
 * Usage: node mark-old-homework-done.js
 * In CI: uses FIREBASE_SERVICE_ACCOUNT env var
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa), projectId: "family-organizer-9b56c" });
  } else {
    const saPath = resolve(__dirname, "serviceAccount.json");
    if (!existsSync(saPath)) {
      console.error("❌ חסר serviceAccount.json או FIREBASE_SERVICE_ACCOUNT env var");
      process.exit(1);
    }
    const sa = JSON.parse(readFileSync(saPath, "utf8"));
    initializeApp({ credential: cert(sa), projectId: "family-organizer-9b56c" });
  }

  return getFirestore();
}

const db = initFirebase();

const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

console.log(`📅 מסמן שיעורי בית ישנים מלפני ${twoWeeksAgo.toLocaleDateString("he-IL")} כבוצע...`);

const snap = await db.collection("schoolUpdates")
  .where("type", "==", "homework")
  .where("read", "==", false)
  .get();

const old = snap.docs.filter(d => d.data().eventDate.toDate() < twoWeeksAgo);

console.log(`🔍 נמצאו ${snap.docs.length} שיעורי בית פתוחים, מתוכם ${old.length} ישנים (לפני שבועיים)`);

if (old.length === 0) {
  console.log("✅ אין מה לסמן.");
  process.exit(0);
}

const BATCH_SIZE = 500;
let marked = 0;
for (let i = 0; i < old.length; i += BATCH_SIZE) {
  const batch = db.batch();
  old.slice(i, i + BATCH_SIZE).forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
  marked += Math.min(BATCH_SIZE, old.length - i);
  console.log(`  ✓ ${marked}/${old.length}`);
}

console.log(`\n✅ סומנו ${marked} שיעורי בית כבוצע.`);
