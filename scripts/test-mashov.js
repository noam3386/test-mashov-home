/**
 * בדיקת חיבור ישירה למשוב — מדפיס ציונים והודעות בלי לכתוב ל-Firestore
 */

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE_URL = "https://web.mashov.info/api";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SEMEL    = 482604;
const USERNAME = "344987276";
const PASSWORD = "aviv2704";
const YEAR     = 5786; // תשפ"ו

console.log("🔐 מתחבר למשוב...");

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

let session;
try {
  const res = await client.post(`${BASE_URL}/login`,
    { semel: SEMEL, username: USERNAME, password: PASSWORD, year: YEAR },
    { headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Origin": "https://web.mashov.info", "Referer": "https://web.mashov.info/" } }
  );
  const csrfToken = res.headers["x-csrf-token"];
  const cookies = await jar.getCookies(BASE_URL);
  session = {
    cookie: cookies.map(c => `${c.key}=${c.value}`).join("; "),
    csrfToken,
    studentId: String(res.data?.students?.[0]?.pupilId ?? USERNAME),
  };
  console.log(`✅ התחברות הצליחה! studentId: ${session.studentId}\n`);
} catch (err) {
  console.error("❌ שגיאת התחברות:", err.response?.status, err.response?.data ?? err.message);
  process.exit(1);
}

const headers = { "User-Agent": USER_AGENT, "Cookie": session.cookie, "X-Csrf-Token": session.csrfToken, "X-Requested-With": "XMLHttpRequest" };

// ציונים
try {
  const res = await axios.get(`${BASE_URL}/students/${session.studentId}/grades`, { headers });
  const grades = res.data?.slice(0, 5) ?? [];
  console.log(`📊 ציונים אחרונים (${res.data?.length ?? 0} סה"כ):`);
  grades.forEach(g => console.log(`   ${g.subject} | ${g.grade}/${g.maxGrade} | ${g.eventDate?.slice(0,10)}`));
} catch (err) {
  console.error("❌ שגיאה בציונים:", err.response?.status);
}

// הודעות
try {
  const res = await axios.get(`${BASE_URL}/messages`, { params: { folder: 1, page: 1, pageSize: 5 }, headers });
  const msgs = res.data ?? [];
  console.log(`\n✉️  הודעות אחרונות (${msgs.length}):`);
  msgs.forEach(m => console.log(`   ${m.subject} | מ: ${m.senderName} | ${m.sendDate?.slice(0,10)}`));
} catch (err) {
  console.error("❌ שגיאה בהודעות:", err.response?.status);
}

// התנהגות
try {
  const res = await axios.get(`${BASE_URL}/students/${session.studentId}/behave`, { headers });
  console.log(`\n📋 התנהגות: ${res.data?.length ?? 0} רשומות`);
} catch (err) {
  console.log(`\n📋 התנהגות: לא זמין (${err.response?.status})`);
}

await axios.post(`${BASE_URL}/logout`, {}, { headers }).catch(() => {});
console.log("\n🔓 התנתקות בוצעה");
