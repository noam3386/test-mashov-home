/**
 * Google Calendar → Firestore sync via public iCal URL
 * Run: node calendar-sync.js
 *
 * Get the iCal URL from Google Calendar:
 *   Calendar Settings → "Public address in iCal format"
 */

import ical from "node-ical";
import axios from "axios";
import { db } from "./firebase-init.js";

const CALENDARS = [
  {
    icalUrl: "https://calendar.google.com/calendar/ical/family13278164042447766357%40group.calendar.google.com/public/basic.ics",
    memberIds: ["uid_aviv"],
    defaultCategory: "family",
  },
  // {
  //   icalUrl: "https://calendar.google.com/calendar/ical/SHISHIGAM_ID%40group.calendar.google.com/public/basic.ics",
  //   memberIds: ["uid_aviv"],
  //   defaultCategory: "chug",
  // },
];

function guessCategory(title, defaultCategory) {
  if (/חוג|שיעור\s/i.test(title)) return "chug";
  if (/ביה["']?ס|בית.ספר/i.test(title)) return "school";
  if (/פגישה|תור\b|doctor/i.test(title)) return "appointment";
  return defaultCategory;
}

function pushWrite(allWrites, cal, component, start, end) {
  const uid     = component.uid ?? `${start.toISOString()}`;
  const isAllDay = component.datetype === "date";
  const docId   = "gcal_" + uid.replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_")
                           + (component.rrule ? "_" + start.toISOString().slice(0, 10) : "");
  const title   = component.summary ?? "(ללא כותרת)";
  allWrites.push({
    ref:  db.collection("schedule").doc(docId),
    data: {
      source:     "google_calendar",
      externalId: uid,
      title,
      memberId:   cal.memberIds,
      startTime:  start,
      endTime:    end ?? start,
      allDay:     isAllDay,
      category:   guessCategory(title, cal.defaultCategory),
      updatedAt:  new Date(),
    },
  });
}

async function syncCalendar() {
  const now     = new Date();
  const timeMin = new Date(now.getTime() - 7  * 86400000);
  const timeMax = new Date(now.getTime() + 30 * 86400000);
  const allWrites = [];

  for (const cal of CALENDARS) {
    console.log(`📅 מושך יומן: ${cal.icalUrl}`);
    const res = await axios.get(cal.icalUrl, { timeout: 15000, responseType: "text" });
    const components = ical.sync.parseICS(res.data);

    for (const component of Object.values(components)) {
      if (component.type !== "VEVENT") continue;

      if (component.rrule) {
        const occurrences = ical.expandRecurringEvent(component, timeMin, timeMax);
        for (const { start, end } of occurrences) {
          pushWrite(allWrites, cal, component, start, end ?? start);
        }
        continue;
      }

      const start = component.start ? new Date(component.start) : null;
      const end   = component.end   ? new Date(component.end)   : start;
      if (!start || start > timeMax || (end ?? start) < timeMin) continue;
      pushWrite(allWrites, cal, component, start, end);
    }
  }

  for (let i = 0; i < allWrites.length; i += 400) {
    const batch = db.batch();
    allWrites.slice(i, i + 400).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }

  console.log(`✅ ${allWrites.length} אירועים עודכנו ב-Firestore`);
}

syncCalendar().catch((err) => {
  console.error("❌ שגיאה:", err.message);
  process.exit(1);
});
