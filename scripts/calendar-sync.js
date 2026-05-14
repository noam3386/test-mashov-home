/**
 * Google Calendar → Firestore sync
 * Run on home machine: node calendar-sync.js
 * Syncs events from the past week to 30 days ahead, every run.
 */

import { google } from "googleapis";
import { db } from "./firebase-init.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CALENDAR_ID = "family13278164042447766357@group.calendar.google.com";

const MEMBER_IDS = ["uid_aviv"]; // ← הוסף UIDs של חברי משפחה נוספים לפי הצורך

const CATEGORY_BY_COLOR = {
  "1":  "appointment",
  "2":  "family",
  "3":  "family",
  "4":  "chug",
  "5":  "school",
  "6":  "chug",
  "7":  "school",
  "8":  "appointment",
  "9":  "family",
  "10": "school",
  "11": "chug",
};

function colorToCategory(colorId) {
  return CATEGORY_BY_COLOR[colorId] ?? "family";
}

async function syncCalendar() {
  const saPath = resolve(__dirname, "serviceAccount.json");
  const sa = JSON.parse(readFileSync(saPath, "utf8"));

  const auth = new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  console.log("📅 מושך אירועים מ-Google Calendar...");

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const events = res.data.items ?? [];
  console.log(`   נמצאו ${events.length} אירועים`);

  const batch = db.batch();
  let count = 0;

  for (const event of events) {
    if (!event.id) continue;

    const docId = "gcal_" + event.id.replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ref = db.collection("schedule").doc(docId);

    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
    const startTime = isAllDay
      ? new Date(event.start.date + "T00:00:00")
      : new Date(event.start.dateTime);
    const endTime = isAllDay
      ? new Date(event.end.date + "T23:59:59")
      : new Date(event.end.dateTime);

    batch.set(ref, {
      source: "google_calendar",
      externalId: event.id,
      title: event.summary ?? "(ללא כותרת)",
      memberId: MEMBER_IDS,
      startTime,
      endTime,
      allDay: isAllDay,
      category: colorToCategory(event.colorId),
      updatedAt: new Date(),
    });
    count++;
  }

  await batch.commit();
  console.log(`✅ ${count} אירועים עודכנו ב-Firestore`);
}

syncCalendar().catch((err) => {
  console.error("❌ שגיאה:", err.message);
  process.exit(1);
});
