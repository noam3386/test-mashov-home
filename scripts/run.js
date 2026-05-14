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

const CALENDAR_ID   = "family13278164042447766357@group.calendar.google.com";
const MEMBER_IDS    = ["uid_aviv"];
const CALENDAR_SYNC_INTERVAL_MS  = 60  * 60 * 1000; // 60 min
const MASHOV_SYNC_INTERVAL_MS    = 120 * 60 * 1000; // 120 min

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
  log("📅", "מסנכרן יומן Google...");
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(readFileSync(saPath, "utf8")),
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = new Date(now.getTime() - 7  * 86400000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 86400000).toISOString();

    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin, timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = res.data.items ?? [];
    const batch = db.batch();

    for (const ev of events) {
      if (!ev.id) continue;
      const docId = "gcal_" + ev.id.replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      batch.set(db.collection("schedule").doc(docId), {
        source:     "google_calendar",
        externalId: ev.id,
        title:      ev.summary ?? "(ללא כותרת)",
        memberId:   MEMBER_IDS,
        startTime:  isAllDay ? new Date(ev.start.date + "T00:00:00") : new Date(ev.start.dateTime),
        endTime:    isAllDay ? new Date(ev.end.date   + "T23:59:59") : new Date(ev.end.dateTime),
        allDay:     isAllDay,
        category:   CATEGORY_BY_COLOR[ev.colorId] ?? "family",
        updatedAt:  new Date(),
      });
    }

    await batch.commit();
    log("✅", `יומן: ${events.length} אירועים עודכנו`);
  } catch (err) {
    log("❌", `יומן נכשל: ${err.message}`);
  }
}

// ─── Mashov Sync ─────────────────────────────────────────────────────────────

async function syncMashov() {
  const day = new Date().getDay(); // 0=Sun ... 6=Sat
  if (day === 5 || day === 6) {
    log("⏭️", "מחוון: דילוג (סוף שבוע)");
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
      const studentId = String(loginRes.data?.students?.[0]?.pupilId ?? student.username);
      const headers   = { "User-Agent": USER_AGENT, "Cookie": cookies, "X-Csrf-Token": csrfToken, "X-Requested-With": "XMLHttpRequest" };

      const [gradesRes, msgsRes] = await Promise.all([
        axios.get(`${MASHOV_BASE}/students/${studentId}/grades`, { headers }),
        axios.get(`${MASHOV_BASE}/messages`, { params: { folder: 1, page: 1, pageSize: 30 }, headers }),
      ]);

      const batch = db.batch();
      let newCount = 0;

      for (const g of (gradesRes.data ?? [])) {
        const docId = `grade_${student.memberId}_${g.gradingEventId}_${g.eventDate?.slice(0,10)}`;
        const ref = db.collection("schoolUpdates").doc(docId);
        if (!(await ref.get()).exists) {
          batch.set(ref, { memberId: student.memberId, type: "grade", subject: g.subject,
            title: g.title, body: "", grade: g.grade, maxGrade: g.maxGrade, weight: g.weight,
            teacherName: g.teacherName, eventDate: new Date(g.eventDate),
            fetchedAt: FieldValue.serverTimestamp(), read: false });
          newCount++;
        }
      }
      for (const m of (msgsRes.data ?? [])) {
        const docId = `msg_${student.memberId}_${m.id}`;
        const ref = db.collection("schoolUpdates").doc(docId);
        if (!(await ref.get()).exists) {
          batch.set(ref, { memberId: student.memberId, type: "message", subject: m.subject,
            title: m.subject, body: m.body, teacherName: m.senderName,
            eventDate: new Date(m.sendDate), fetchedAt: FieldValue.serverTimestamp(), read: false });
          newCount++;
        }
      }

      await batch.commit();
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
log("⏰", `יומן: כל ${CALENDAR_SYNC_INTERVAL_MS / 60000} דקות | מחוון: כל ${MASHOV_SYNC_INTERVAL_MS / 60000} דקות`);

// Run immediately on start
await syncCalendar();
await syncMashov();

// Then on intervals
setInterval(syncCalendar, CALENDAR_SYNC_INTERVAL_MS);
setInterval(syncMashov,   MASHOV_SYNC_INTERVAL_MS);

log("💤", "רץ ברקע — השאר חלון זה פתוח");
