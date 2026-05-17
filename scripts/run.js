/**
 * Multi-Family Dashboard Sync Runner
 * ===================================
 * Reads all family configs from Firestore, syncs each family's:
 *   • Google Calendar → families/{familyId}/schedule
 *   • Mashov data     → families/{familyId}/schoolUpdates + timetable
 *
 * Each family configures their credentials via the web app Settings page.
 * Credentials are stored in families/{familyId}/settings/mashov (Admin SDK only).
 */

import { google } from "googleapis";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const CALENDAR_SYNC_INTERVAL_MS = 60  * 60 * 1000; // 60 min
const MASHOV_SYNC_INTERVAL_MS   = 120 * 60 * 1000; // 120 min

const MASHOV_BASE = "https://web.mashov.info/api";
const USER_AGENT  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CATEGORY_BY_COLOR = {
  "1": "appointment", "2": "family",  "3": "family",
  "4": "chug",        "5": "school",  "6": "chug",
  "7": "school",      "8": "appointment", "9": "family",
  "10": "school",     "11": "chug",
};

// ─── Init Firebase ────────────────────────────────────────────────────────────

const saPath = resolve(__dirname, "serviceAccount.json");
if (!existsSync(saPath)) {
  console.error("❌ חסר scripts/serviceAccount.json");
  process.exit(1);
}
if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(saPath, "utf8"))) });
}
const db = getFirestore();

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`[${new Date().toLocaleTimeString("he-IL")}] ${emoji}  ${msg}`);
}

// ─── Family Discovery ─────────────────────────────────────────────────────────

async function getAllFamilySettings() {
  const familiesSnap = await db.collection("families").get();
  const results = [];
  for (const familyDoc of familiesSnap.docs) {
    const familyId = familyDoc.id;
    const settingsSnap = await db
      .collection("families")
      .doc(familyId)
      .collection("settings")
      .doc("mashov")
      .get();
    if (settingsSnap.exists) {
      results.push({ familyId, settings: settingsSnap.data() });
    }
  }
  return results;
}

// ─── Google Calendar Sync ─────────────────────────────────────────────────────

async function syncCalendarForFamily(familyId, calendarId) {
  if (!calendarId) return;
  log("📅", `[${familyId}] מסנכרן יומן ${calendarId.slice(0, 20)}...`);
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(readFileSync(saPath, "utf8")),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    const now     = new Date();
    const timeMin = new Date(now.getTime() - 7  * 86400000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString();

    const res = await calendar.events.list({
      calendarId,
      timeMin, timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = res.data.items ?? [];
    const batch  = db.batch();
    const scheduleCol = db
      .collection("families")
      .doc(familyId)
      .collection("schedule");

    for (const ev of events) {
      if (!ev.id) continue;
      const docId    = "gcal_" + ev.id.replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      batch.set(scheduleCol.doc(docId), {
        source:     "google_calendar",
        externalId: ev.id,
        title:      ev.summary ?? "(ללא כותרת)",
        startTime:  isAllDay ? new Date(ev.start.date + "T00:00:00") : new Date(ev.start.dateTime),
        endTime:    isAllDay ? new Date(ev.end.date   + "T23:59:59") : new Date(ev.end.dateTime),
        allDay:     isAllDay,
        category:   CATEGORY_BY_COLOR[ev.colorId] ?? "family",
        updatedAt:  new Date(),
      });
    }

    await batch.commit();
    log("✅", `[${familyId}] יומן: ${events.length} אירועים`);
  } catch (err) {
    log("❌", `[${familyId}] יומן נכשל: ${err.message}`);
  }
}

// ─── Mashov Sync ─────────────────────────────────────────────────────────────

async function syncMashovForFamily(familyId, students) {
  const day = new Date().getDay();
  if (day === 6) { log("⏭️", `[${familyId}] מחוון: דילוג (שבת)`); return; }

  const schoolUpdatesCol = db.collection("families").doc(familyId).collection("schoolUpdates");
  const timetableCol     = db.collection("families").doc(familyId).collection("timetable");
  const configRef        = db.collection("families").doc(familyId).collection("config").doc("mashov");

  async function commitInChunks(writes) {
    for (let i = 0; i < writes.length; i += 400) {
      const b = db.batch();
      writes.slice(i, i + 400).forEach(({ ref, data }) => b.set(ref, data));
      await b.commit();
    }
  }

  for (const student of students) {
    if (!student.memberId || !student.username || !student.password || !student.semel) {
      log("⚠️", `[${familyId}] תלמיד חסר פרטים — מדלג`);
      continue;
    }
    try {
      const jar    = new CookieJar();
      const client = wrapper(axios.create({ jar }));

      const loginRes = await client.post(`${MASHOV_BASE}/login`,
        { semel: student.semel, username: student.username, password: student.password, year: student.year },
        { headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json",
                     "X-Requested-With": "XMLHttpRequest",
                     "Origin": "https://web.mashov.info", "Referer": "https://web.mashov.info/" } }
      );

      const csrfToken = loginRes.headers["x-csrf-token"];
      const cookies   = (await jar.getCookies(MASHOV_BASE)).map(c => `${c.key}=${c.value}`).join("; ");
      const studentId = loginRes.data?.credential?.userId
        ?? loginRes.data?.accessToken?.children?.[0]?.childGuid
        ?? student.username;
      const headers   = { "User-Agent": USER_AGENT, "Cookie": cookies, "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest" };

      log("🔑", `[${familyId}] studentId: ${studentId}`);

      const [behaveRes, homeworkRes, hatamotRes, timetableRes] = await Promise.allSettled([
        axios.get(`${MASHOV_BASE}/students/${studentId}/behave`,    { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/homework`,  { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/hatamot`,   { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/timetable`, { headers }),
      ]);
      const behave    = behaveRes.status    === "fulfilled" ? (behaveRes.value.data   ?? []) : [];
      const homework  = homeworkRes.status  === "fulfilled" ? (homeworkRes.value.data ?? []) : [];
      const hatamot   = hatamotRes.status   === "fulfilled" ? (hatamotRes.value.data  ?? []) : [];
      const timetable = timetableRes.status === "fulfilled" ? (timetableRes.value.data ?? []) : [];

      if (behaveRes.status    === "rejected") log("⚠️", `[${familyId}] התנהגות: ${behaveRes.reason?.response?.status}`);
      if (homeworkRes.status  === "rejected") log("⚠️", `[${familyId}] שיעורי בית: ${homeworkRes.reason?.response?.status}`);
      if (hatamotRes.status   === "rejected") log("⚠️", `[${familyId}] ציוד: ${hatamotRes.reason?.response?.status}`);
      if (timetableRes.status === "rejected") log("⚠️", `[${familyId}] מערכת שעות: ${timetableRes.reason?.response?.status}`);

      const existingSnap = await schoolUpdatesCol
        .where("memberId", "==", student.memberId)
        .select()
        .get();
      const existingIds = new Set(existingSnap.docs.map(d => d.id));

      const writes = [];

      for (const b of behave) {
        const dateKey = (b.timestamp ?? b.lessonDate ?? "").slice(0, 10);
        const docId   = `behave_${student.memberId}_${b.lessonId ?? b.groupId}_${dateKey}`;
        if (!existingIds.has(docId)) {
          writes.push({ ref: schoolUpdatesCol.doc(docId), data: {
            memberId: student.memberId, type: "behavior",
            eventCode: b.eventCode ?? 0,
            categoryName: b.categoryName ?? b.eventType ?? "",
            subjectName: b.subjectName ?? b.lessonSubjectName ?? b.groupName ?? "",
            justified: b.justified ?? -1,
            groupId: b.groupId ?? null,
            teacherName: b.reporterName ?? "",
            eventDate: new Date(b.timestamp ?? b.lessonDate),
            fetchedAt: FieldValue.serverTimestamp(), read: false,
          }});
        }
      }

      for (const h of homework) {
        const docId = `hw_${student.memberId}_${h.lessonId}`;
        if (!existingIds.has(docId)) {
          writes.push({ ref: schoolUpdatesCol.doc(docId), data: {
            memberId: student.memberId, type: "homework",
            subject: h.subjectName ?? "",
            title: h.subjectName ?? "",
            body: h.homework ?? "",
            remark: h.remark ?? "",
            teacherName: h.teacherName ?? "",
            eventDate: new Date(h.lessonDate ?? Date.now()),
            fetchedAt: FieldValue.serverTimestamp(), read: false,
          }});
        }
      }

      for (const item of hatamot) {
        const docId = `hat_${student.memberId}_${item.code ?? item.name?.slice(0, 10)}`;
        writes.push({ ref: schoolUpdatesCol.doc(docId), data: {
          memberId: student.memberId, type: "hatamot",
          title: item.name ?? "",
          body: item.remark ?? "",
          eventDate: new Date(),
          fetchedAt: FieldValue.serverTimestamp(), read: true,
        }});
      }

      await commitInChunks(writes);

      const ttWrites = timetable.map(entry => {
        const tt  = entry.timeTable ?? entry;
        const gd  = entry.groupDetails ?? {};
        const docId = `tt_${student.memberId}_d${tt.day}_l${tt.lesson}`;
        return { ref: timetableCol.doc(docId), data: {
          memberId: student.memberId,
          day: tt.day - 1, lesson: tt.lesson, roomNum: tt.roomNum ?? "",
          subjectName: gd.subjectName ?? tt.subjectName ?? "",
          groupName: gd.groupName ?? "",
          teacherName: gd.groupTeachers?.[0]?.teacherName ?? "",
          updatedAt: FieldValue.serverTimestamp(),
        }};
      });
      if (ttWrites.length > 0) await commitInChunks(ttWrites);

      await axios.post(`${MASHOV_BASE}/logout`, {}, { headers }).catch(() => {});
      log("✅", `[${familyId}] ${student.memberId}: ${writes.length} רשומות חדשות`);

      await configRef.set({ consecutiveFailures: 0, lastSyncAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (err) {
      log("❌", `[${familyId}] ${student.memberId} נכשל: ${err.response?.status ?? err.message}`);
      await configRef.set({ consecutiveFailures: FieldValue.increment(1) }, { merge: true }).catch(() => {});
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function syncAll() {
  const families = await getAllFamilySettings();
  log("🏠", `נמצאו ${families.length} משפחות`);

  for (const { familyId, settings } of families) {
    const students   = settings.students   ?? [];
    const calendarId = settings.calendarId ?? null;

    if (calendarId) await syncCalendarForFamily(familyId, calendarId);
    if (students.length) await syncMashovForFamily(familyId, students);
    else log("⚠️", `[${familyId}] אין תלמידים מוגדרים`);
  }
}

log("🚀", "Multi-Family Dashboard Sync — מתחיל");

await syncAll();

if (process.env.CI) {
  log("✅", "סנכרון הסתיים — יוצא");
  process.exit(0);
}

log("⏰", `רץ כל ${CALENDAR_SYNC_INTERVAL_MS / 60000} דקות (יומן) / ${MASHOV_SYNC_INTERVAL_MS / 60000} דקות (מחוון)`);
setInterval(syncAll, Math.min(CALENDAR_SYNC_INTERVAL_MS, MASHOV_SYNC_INTERVAL_MS));

log("💤", "רץ ברקע — השאר חלון זה פתוח");
