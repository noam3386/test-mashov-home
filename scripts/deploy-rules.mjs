/**
 * Deploy Firestore security rules via Firebase Rules REST API.
 * Uses the service account JSON (file or FIREBASE_SERVICE_ACCOUNT env var).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleAuth } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = "family-organizer-9b56c";
const RULES_FILE = resolve(__dirname, "../firestore.rules");

// Load service account
function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const saPath = resolve(__dirname, "serviceAccount.json");
  if (!existsSync(saPath)) {
    console.error("❌ No FIREBASE_SERVICE_ACCOUNT env var and no serviceAccount.json");
    process.exit(1);
  }
  return JSON.parse(readFileSync(saPath, "utf8"));
}

const sa = loadServiceAccount();
const auth = new GoogleAuth({
  credentials: sa,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const rules = readFileSync(RULES_FILE, "utf8");
console.log(`📋 Deploying Firestore rules from ${RULES_FILE}...`);

const client = await auth.getClient();
const token = (await client.getAccessToken()).token;

const BASE = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;

// 1. Create a new ruleset
const rulesetRes = await fetch(`${BASE}/rulesets`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    source: { files: [{ name: "firestore.rules", content: rules }] },
  }),
});
if (!rulesetRes.ok) {
  const err = await rulesetRes.json();
  console.error("❌ Failed to create ruleset:", JSON.stringify(err, null, 2));
  process.exit(1);
}
const ruleset = await rulesetRes.json();
console.log(`✅ Ruleset created: ${ruleset.name}`);

// 2. Update the cloud.firestore release to point to the new ruleset
const releaseRes = await fetch(`${BASE}/releases/cloud.firestore`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: `${BASE}/releases/cloud.firestore`, rulesetName: ruleset.name }),
});
if (!releaseRes.ok) {
  const err = await releaseRes.json();
  console.error("❌ Failed to update release:", JSON.stringify(err, null, 2));
  process.exit(1);
}
console.log("✅ Firestore rules deployed successfully!");
