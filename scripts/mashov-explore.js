import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE = "https://web.mashov.info/api";
const UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const jar    = new CookieJar();
const client = wrapper(axios.create({ jar }));

console.log("מתחבר למחוון...");
const loginRes = await client.post(`${BASE}/login`,
  { semel: 482604, username: "344987276", password: "aviv2704", year: 2026 },
  { headers: { "User-Agent": UA, "Content-Type": "application/json",
               "X-Requested-With": "XMLHttpRequest",
               "Origin": "https://web.mashov.info", "Referer": "https://web.mashov.info/" } }
);

const csrf      = loginRes.headers["x-csrf-token"];
const cookies   = (await jar.getCookies(BASE)).map(c => `${c.key}=${c.value}`).join("; ");
const studentId = loginRes.data?.credential?.userId;
const h         = { "User-Agent": UA, "Cookie": cookies, "X-Csrf-Token": csrf, "X-Requested-With": "XMLHttpRequest" };

console.log(`studentId: ${studentId}\n`);

async function tryEndpoint(label, url, params = {}) {
  try {
    const res = await axios.get(url, { headers: h, params });
    const data = res.data;
    const count = Array.isArray(data) ? data.length : typeof data === "object" ? Object.keys(data).length : 1;
    console.log(`✅ ${label}: ${count} פריטים`);
    if (Array.isArray(data) && data.length > 0) {
      console.log(`   דוגמה:`, JSON.stringify(data[0]).slice(0, 200));
    }
    return data;
  } catch (e) {
    console.log(`❌ ${label}: ${e.response?.status ?? e.message}`);
    return null;
  }
}

// Test all known Mashov endpoints
await tryEndpoint("ציונים רגילים",   `${BASE}/students/${studentId}/grades`);
await tryEndpoint("ציונים תקופתיים", `${BASE}/students/${studentId}/periodGrades`);
await tryEndpoint("התנהגות",          `${BASE}/students/${studentId}/behave`);
await tryEndpoint("מעקב (maakav)",    `${BASE}/students/${studentId}/maakav`);
await tryEndpoint("מערכת שעות",      `${BASE}/students/${studentId}/timetable`);
await tryEndpoint("היסטוריית שיעורים",`${BASE}/students/${studentId}/lessonsHistory`);
await tryEndpoint("הודעות נכנסות",   `${BASE}/messages`, { folder: 1, page: 1, pageSize: 10 });
await tryEndpoint("הודעות יוצאות",   `${BASE}/messages`, { folder: 2, page: 1, pageSize: 10 });
await tryEndpoint("חיסורים",          `${BASE}/students/${studentId}/attendance`);
await tryEndpoint("קבוצות",           `${BASE}/students/${studentId}/groups`);

await axios.post(`${BASE}/logout`, {}, { headers: h }).catch(() => {});
console.log("\nסיום");
