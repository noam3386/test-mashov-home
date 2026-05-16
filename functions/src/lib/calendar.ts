import { google } from "googleapis";
import { db } from "./firestore";

const CALENDARS = [
  { id: "family13278164042447766357@group.calendar.google.com", memberIds: ["uid_aviv"] },
];

const CATEGORY_BY_COLOR: Record<string, string> = {
  "1": "appointment", "2": "family",  "3": "family",
  "4": "chug",        "5": "school",  "6": "chug",
  "7": "school",      "8": "appointment", "9": "family",
  "10": "school",     "11": "chug",
};

export async function syncCalendar(): Promise<void> {
  // Uses Application Default Credentials — the Firebase service account.
  // The service account must be added as a viewer to each calendar above.
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = new Date(now.getTime() - 7  * 86400000).toISOString();
  const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString();

  let totalEvents = 0;
  const batch = db().batch();

  for (const cal of CALENDARS) {
    const res = await calendar.events.list({
      calendarId: cal.id,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = res.data.items ?? [];
    totalEvents += events.length;

    for (const ev of events) {
      if (!ev.id) continue;
      const docId = "gcal_" + ev.id.replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      batch.set(db().collection("schedule").doc(docId), {
        source:     "google_calendar",
        externalId: ev.id,
        title:      ev.summary ?? "(ללא כותרת)",
        memberId:   cal.memberIds,
        startTime:  isAllDay ? new Date(ev.start!.date! + "T00:00:00") : new Date(ev.start!.dateTime!),
        endTime:    isAllDay ? new Date(ev.end!.date!   + "T23:59:59") : new Date(ev.end!.dateTime!),
        allDay:     isAllDay,
        category:   CATEGORY_BY_COLOR[ev.colorId ?? ""] ?? "family",
        updatedAt:  new Date(),
      });
    }
  }

  await batch.commit();
  console.log(`✅ Calendar: ${totalEvents} events synced`);
}
