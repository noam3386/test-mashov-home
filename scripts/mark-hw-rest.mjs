/**
 * Mark old homework as done via Firestore REST API (no service account needed)
 */

const API_KEY   = "AIzaSyAkPQBeZhIpXZRK4ACppqrR72hCw1lYkbk";
const PROJECT   = "family-organizer-9b56c";
const BASE      = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
console.log(`📅 מסמן שיעורי בית לפני ${twoWeeksAgo.toLocaleDateString("he-IL")} כבוצע...`);

// Fetch all homework documents (paginate)
async function fetchAll() {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${BASE}/schoolUpdates?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}&key=${API_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    for (const doc of (data.documents ?? [])) {
      const f = doc.fields ?? {};
      if (f.type?.stringValue !== "homework") continue;
      if (f.read?.booleanValue === true) continue;
      const eventDate = new Date(f.eventDate?.timestampValue ?? 0);
      if (eventDate < twoWeeksAgo) docs.push(doc.name);
    }
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);
  return docs;
}

const toMark = await fetchAll();
console.log(`🔍 נמצאו ${toMark.length} שיעורי בית ישנים לסימון`);

if (toMark.length === 0) {
  console.log("✅ אין מה לסמן.");
  process.exit(0);
}

let done = 0;
for (const name of toMark) {
  const url = `${name}?updateMask.fieldPaths=read&key=${API_KEY}`;
  const res  = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { read: { booleanValue: true } } }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error(`❌ שגיאה ב-${name.split("/").pop()}:`, err.error?.message);
    continue;
  }
  done++;
  if (done % 20 === 0) console.log(`  ✓ ${done}/${toMark.length}`);
}

console.log(`\n✅ סומנו ${done} שיעורי בית כבוצע.`);
