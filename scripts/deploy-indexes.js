/**
 * Deploy Firestore composite indexes via REST API
 * (firebase deploy --only firestore:indexes fails due to serviceusage 403)
 */
import { google } from "googleapis";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync("./serviceAccount.json", "utf8"));
const auth = new google.auth.GoogleAuth({
  credentials: sa,
  scopes: ["https://www.googleapis.com/auth/datastore"],
});
const token = await auth.getAccessToken();
const project = "family-organizer-9b56c";
const BASE = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`;
const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok && !data.error?.message?.includes("already exists")) {
    console.error("❌", data.error?.message ?? JSON.stringify(data));
  }
  return data;
}

async function createIndex(collectionId, fields) {
  const label = `${collectionId}: ${fields.map(f => `${f.fieldPath} ${f.order ?? f.arrayConfig}`).join(", ")}`;
  const res = await post(`${BASE}/${collectionId}/indexes`, {
    queryScope: "COLLECTION",
    fields,
  });
  if (res.error?.message?.includes("already exists")) {
    console.log(`✅ (קיים) ${label}`);
  } else if (res.name) {
    console.log(`🔨 (נבנה) ${label}`);
  }
}

console.log("📋 יוצר אינדקסים...\n");

await createIndex("tasks", [
  { fieldPath: "assignedTo", arrayConfig: "CONTAINS" },
  { fieldPath: "status",     order: "ASCENDING" },
  { fieldPath: "dueDate",    order: "ASCENDING" },
]);

await createIndex("schedule", [
  { fieldPath: "memberId",  arrayConfig: "CONTAINS" },
  { fieldPath: "startTime", order: "ASCENDING" },
]);

// schoolUpdates: memberId + type + eventDate DESC
await createIndex("schoolUpdates", [
  { fieldPath: "memberId",  order: "ASCENDING" },
  { fieldPath: "type",      order: "ASCENDING" },
  { fieldPath: "eventDate", order: "DESCENDING" },
]);

// schoolUpdates: memberId + read + fetchedAt DESC
await createIndex("schoolUpdates", [
  { fieldPath: "memberId",  order: "ASCENDING" },
  { fieldPath: "read",      order: "ASCENDING" },
  { fieldPath: "fetchedAt", order: "DESCENDING" },
]);

// schoolUpdates: type + eventDate DESC  ← BehaviorTile
await createIndex("schoolUpdates", [
  { fieldPath: "type",      order: "ASCENDING" },
  { fieldPath: "eventDate", order: "DESCENDING" },
]);

// schoolUpdates: type + eventDate ASC  ← SchoolTomorrowTile homework
await createIndex("schoolUpdates", [
  { fieldPath: "type",      order: "ASCENDING" },
  { fieldPath: "eventDate", order: "ASCENDING" },
]);

// timetable: day + lesson ASC  ← SchoolTomorrowTile timetable
await createIndex("timetable", [
  { fieldPath: "day",    order: "ASCENDING" },
  { fieldPath: "lesson", order: "ASCENDING" },
]);

console.log("\nסיום. אינדקסים חדשים ייבנו תוך כמה דקות.");
