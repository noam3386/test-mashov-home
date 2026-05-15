/**
 * Family Dashboard — Home Automation Runner
 * ==========================================
 * Run once: node run.js
 * Runs forever in background, syncing:
 *   • Google Calendar → Firestore  (every 60 min)
 *   • Mashov grades/messages        (every 120 min, Sun-Thu only)
 *
 * Windows auto-start: see README below
 * Mac auto-start:     see README below
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

const CALENDARS = [
  { id: "family13278164042447766357@group.calendar.google.com", memberIds: ["uid_aviv"] },
  // { id: "SHISHIGAM_CALENDAR_ID@group.calendar.google.com",    memberIds: ["uid_aviv"] }, // ← שישיגם (להוסיף)
];
const CALENDAR_SYNC_INTERVAL_MS  = 60  * 60 * 1000; // 60 דקות
const MASHOV_SYNC_INTERVAL_MS    = 120 * 60 * 1000; // 120 דקות

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

// ─── Google Calendar Sync ─────────────────────────────────────────────────────

async function syncCalendar() {
  log("📅", `מסנכרן ${CALENDARS.length} יומנים...`);
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(readFileSync(saPath, "utf8")),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = new Date(now.getTime() - 7  * 86400000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString();

    let totalEvents = 0;
    const batch = db.batch();

    for (const cal of CALENDARS) {
      const res = await calendar.events.list({
        calendarId: cal.id,
        timeMin, timeMax,
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
        batch.set(db.collection("schedule").doc(docId), {
          source:     "google_calendar",
          externalId: ev.id,
          title:     ev.summary ?? "(ללא כותרת)",
          memberId:  cal.memberIds,
          startTime: isAllDay ? new Date(ev.start.date + "T00:00:00") : new Date(ev.start.dateTime),
          endTime:   isAllDay ? new Date(ev.end.date   + "T23:59:59") : new Date(ev.end.dateTime),
          allDay:    isAllDay,
          category:  CATEGORY_BY_COLOR[ev.colorId] ?? "family",
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();
    log("✅", `יומן: ${totalEvents} אירועים עודכנו`);
  } catch (err) {
    log("❌", `יומן נכשל: ${err.message}`);
  }
}

// ─── Mashov Sync ─────────────────────────────────────────────────────────────

async function syncMashov() {
  const day = new Date().getDay(); // 0=Sun ... 6=Sat
  if (day === 6) { // שבת בלבד
    log("⏭️", "מחוון: דילוג (שבת)");
    return;
  }

  log("🏫", "מסנכרן מחוון...");

  const configSnap = await db.collection("config").doc("mashov").get();
  const students = configSnap.data()?.students ?? [];
  if (!students.length) { log("⚠️", "מחוון: אין תלמידים מוגדרים"); return; }

  for (const student of students) {
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
      // Use GUID from credential.userId, not idNumber
      const studentId = loginRes.data?.credential?.userId
        ?? loginRes.data?.accessToken?.children?.[0]?.childGuid
        ?? student.username;
      const headers   = { "User-Agent": USER_AGENT, "Cookie": cookies, "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest" };

      log("🔑", `studentId: ${studentId}`);

      // Fetch all available endpoints in parallel
      const [behaveRes, homeworkRes, hatamotRes, timetableRes] = await Promise.allSettled([
        axios.get(`${MASHOV_BASE}/students/${studentId}/behave`,   { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/homework`, { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/hatamot`,  { headers }),
        axios.get(`${MASHOV_BASE}/students/${studentId}/timetable`,{ headers }),
      ]);
      const behave   = behaveRes.status    === "fulfilled" ? (behaveRes.value.data   ?? []) : [];
      const homework = homeworkRes.status  === "fulfilled" ? (homeworkRes.value.data ?? []) : [];
      const hatamot  = hatamotRes.status   === "fulfilled" ? (hatamotRes.value.data  ?? []) : [];
      const timetable= timetableRes.status === "fulfilled" ? (timetableRes.value.data?? []) : [];
      if (behaveRes.status    === "rejected") log("⚠️", `התנהגות לא זמינה: ${behaveRes.reason?.response?.status}`);
      if (homeworkRes.status  === "rejected") log("⚠️", `שיעורי בית לא זמינים: ${homeworkRes.reason?.response?.status}`);
      if (hatamotRes.status   === "rejected") log("⚠️", `ציוד לא זמין: ${hatamotRes.reason?.response?.status}`);
      if (timetableRes.status === "rejected") log("⚠️", `מערכת שעות לא זמינה: ${timetableRes.reason?.response?.status}`);

      // Commit an array of writes split into chunks of 400 (Firestore limit = 500)
      async function commitInChunks(writes) {
        for (let i = 0; i < writes.length; i += 400) {
          const b = db.batch();
          writes.slice(i, i + 400).forEach(({ ref, data }) => b.set(ref, data));
          await b.commit();
        }
      }

      // Fetch existing docIds to avoid overwriting (one parallel read per collection)
      const existingSnap = await db.collection("schoolUpdates")
        .where("memberId", "==", student.memberId)
        .select() // no fields needed, just doc IDs
        .get();
      const existingIds = new Set(existingSnap.docs.map(d => d.id));

      const writes = [];

      // Behavior events (write only new)
      for (const b of behave) {
        const dateKey = (b.timestamp ?? b.lessonDate ?? "").slice(0, 10);
        const docId = `behave_${student.memberId}_${b.lessonId ?? b.groupId}_${dateKey}`;
        if (!existingIds.has(docId)) {
          writes.push({ ref: db.collection("schoolUpdates").doc(docId), data: {
            memberId: student.memberId, type: "behavior",
            eventCode: b.eventCode ?? 0,
            categoryName: b.categoryName ?? b.eventType ?? "",
            justified: b.justified ?? -1,
            groupId: b.groupId ?? null,
            teacherName: b.reporterName ?? "",
            eventDate: new Date(b.timestamp ?? b.lessonDate),
            fetchedAt: FieldValue.serverTimestamp(), read: false,
          }});
        }
      }

      // Homework (write only new — docId per lessonId is stable)
      for (const h of homework) {
        const docId = `hw_${student.memberId}_${h.lessonId}`;
        if (!existingIds.has(docId)) {
          writes.push({ ref: db.collection("schoolUpdates").doc(docId), data: {
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

      // Equipment / Hatamot (always overwrite — may change)
      for (const item of hatamot) {
        const docId = `hat_${student.memberId}_${item.code ?? item.name?.slice(0,10)}`;
        writes.push({ ref: db.collection("schoolUpdates").doc(docId), data: {
          memberId: student.memberId, type: "hatamot",
          title: item.name ?? "",
          body: item.remark ?? "",
          eventDate: new Date(),
          fetchedAt: FieldValue.serverTimestamp(), read: true,
        }});
      }

      await commitInChunks(writes);
      const newCount = writes.length;

      // Timetable (overwrite all — store in separate collection)
      const ttWrites = timetable.map(entry => {
        const tt = entry.timeTable ?? entry;
        const gd = entry.groupDetails ?? {};
        const docId = `tt_${student.memberId}_d${tt.day}_l${tt.lesson}`;
        return { ref: db.collection("timetable").doc(docId), data: {
          memberId: student.memberId,
          day: tt.day - 1, lesson: tt.lesson, roomNum: tt.roomNum ?? "",
          subjectName: gd.subjectName ?? tt.subjectName ?? "",
          groupName: gd.groupName ?? "",
          teacherName: gd.groupTeachers?.[0]?.teacherName ?? "",
          updatedAt: FieldValue.serverTimestamp(),
        }};
      });
      if (ttWrites.length > 0) {
        await commitInChunks(ttWrites);
        log("📋", `מערכת שעות: ${ttWrites.length} שיעורים עודכנו`);
      }

      await axios.post(`${MASHOV_BASE}/logout`, {}, { headers }).catch(() => {});
      log("✅", `מחוון ${student.memberId}: ${newCount} רשומות חדשות`);

      await db.collection("config").doc("mashov").update({
        consecutiveFailures: 0,
        lastSyncAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      log("❌", `מחוון ${student.memberId} נכשל: ${err.response?.status ?? err.message}`);
      await db.collection("config").doc("mashov").update({
        consecutiveFailures: FieldValue.increment(1),
      }).catch(() => {});
    }
  }
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

log("🚀", "Family Dashboard Sync — מתחיל");

await syncCalendar();
await syncMashov();

// Always stamp the last sync time so the dashboard badge stays fresh
await db.collection("config").doc("mashov").update({
  lastSyncAt: FieldValue.serverTimestamp(),
}).catch(() => {});

// In CI (GitHub Actions) — exit after one run
if (process.env.CI) {
  log("✅", "סנכרון הסתיים — יוצא");
  process.exit(0);
}

// Local: keep running on intervals
log("⏰", `יומן: כל ${CALENDAR_SYNC_INTERVAL_MS / 60000} דקות | מחוון: כל ${MASHOV_SYNC_INTERVAL_MS / 60000} דקות`);
setInterval(syncCalendar, CALENDAR_SYNC_INTERVAL_MS);
setInterval(syncMashov,   MASHOV_SYNC_INTERVAL_MS);

log("💤", "רץ ברקע — השאר חלון זה פתוח");
