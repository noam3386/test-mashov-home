import { google } from "googleapis";
import { readFileSync } from "fs";
import https from "https";

const sa = JSON.parse(readFileSync("./serviceAccount.json", "utf8"));
const auth = new google.auth.GoogleAuth({
  credentials: sa,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const token = await auth.getAccessToken();
const rules = readFileSync("../firestore.rules", "utf8");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
const project = "family-organizer-9b56c";

// Step 1: create ruleset
console.log("📋 יוצר ruleset...");
const createBody = JSON.stringify({ source: { files: [{ content: rules, name: "firestore.rules" }] } });
const ruleset = await request({ hostname: "firebaserules.googleapis.com", path: `/v1/projects/${project}/rulesets`, method: "POST", headers }, createBody);
if (ruleset.error) { console.error("❌", ruleset.error.message); process.exit(1); }
console.log("✅ Ruleset:", ruleset.name);

// Step 2: update release
console.log("🚀 מעדכן release...");
const releaseBody = JSON.stringify({ release: { name: `projects/${project}/releases/cloud.firestore`, rulesetName: ruleset.name } });
const release = await request({ hostname: "firebaserules.googleapis.com", path: `/v1/projects/${project}/releases/cloud.firestore`, method: "PATCH", headers }, releaseBody);
if (release.error) { console.error("❌", release.error.message); process.exit(1); }
console.log("✅ Rules deployed!", release.name);
