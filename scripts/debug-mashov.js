/**
 * Debug Mashov — בדיקה מפורטת עם שנים שונות
 */
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE = "https://web.mashov.info/api";
const UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS_BASE = { "User-Agent": UA, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Origin": "https://web.mashov.info", "Referer": "https://web.mashov.info/" };

const SEMEL    = 482604;
const USERNAME = "344987276";
const PASSWORD = "aviv2704";
const YEARS    = [2026, 5786, 2025, 5785];

for (const year of YEARS) {
  console.log(`\n🔐 מנסה שנה ${year}...`);
  const jar    = new CookieJar();
  const client = wrapper(axios.create({ jar }));
  try {
    const res = await client.post(`${BASE}/login`,
      { semel: SEMEL, username: USERNAME, password: PASSWORD, year },
      { headers: HEADERS_BASE }
    );
    const csrf     = res.headers["x-csrf-token"];
    const cookies  = (await jar.getCookies(BASE)).map(c => `${c.key}=${c.value}`).join("; ");
    const students = res.data?.students;
    console.log(`✅ התחברות הצליחה!`);
    console.log(`   תגובה מלאה:`, JSON.stringify(res.data));
    console.log(`   csrf: ${csrf ? "קיים" : "חסר"}`);

    const studentId = students?.[0]?.pupilId ?? USERNAME;
    const h = { "User-Agent": UA, "Cookie": cookies, "X-Csrf-Token": csrf, "X-Requested-With": "XMLHttpRequest" };

    try {
      const gr = await axios.get(`${BASE}/students/${studentId}/grades`, { headers: h });
      console.log(`📊 ציונים: ${gr.data?.length ?? 0} רשומות`);
    } catch (e) {
      console.log(`   ציונים: ${e.response?.status} ${e.response?.data?.message ?? ""}`);
    }

    await axios.post(`${BASE}/logout`, {}, { headers: h }).catch(() => {});
    break;
  } catch (e) {
    console.log(`❌ שנה ${year}: ${e.response?.status} — ${JSON.stringify(e.response?.data)?.slice(0,100)}`);
  }
}
