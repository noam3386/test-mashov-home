import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  const saPath = resolve(__dirname, "serviceAccount.json");
  if (!existsSync(saPath)) {
    console.error("❌ חסר קובץ serviceAccount.json בתיקיית scripts/");
    console.error("   הורד אותו מ: Firebase Console → Project Settings → Service accounts → Generate new private key");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "family-organizer-9b56c",
  });

  return getFirestore();
}

export const db = initFirebase();
