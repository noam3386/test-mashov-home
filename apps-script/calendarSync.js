var FIRESTORE_PROJECT_ID = "family-organizer-9b56c";

var CALENDAR_IDS = [
  // Add your Google Calendar IDs here, e.g.:
  // "primary",
  // "family_calendar_id@group.calendar.google.com"
];

var MEMBER_MAP = {
  // Map calendar IDs to member IDs
  // "primary": ["uid_parent"],
  // "family_calendar_id@group.calendar.google.com": ["uid_parent", "uid_child1"]
};

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncCalendarsToFirestore")
    .timeBased()
    .everyMinutes(15)
    .create();
  Logger.log("Trigger installed: syncCalendarsToFirestore every 15 minutes");
}

function syncCalendarsToFirestore() {
  var token = getFirestoreToken();
  var now = new Date();
  var from = new Date(now.getTime() - 20 * 60 * 1000); // 20 min ago
  var to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  CALENDAR_IDS.forEach(function(calId) {
    var cal = CalendarApp.getCalendarById(calId);
    if (!cal) return;
    var events = cal.getEvents(from, to);
    events.forEach(function(event) {
      var docId = "gcal_" + event.getId().replace(/@.*/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      var data = calendarEventToFirestore(event, calId);
      upsertFirestore(token, "schedule", docId, data);
    });
  });
}

function calendarEventToFirestore(event, calId) {
  var colorIndex = event.getColor();
  var category = colorToCategory(colorIndex);
  var memberIds = MEMBER_MAP[calId] || [];

  return {
    fields: {
      source: { stringValue: "google_calendar" },
      externalId: { stringValue: event.getId() },
      title: { stringValue: event.getTitle() },
      memberId: { arrayValue: { values: memberIds.map(function(id) { return { stringValue: id }; }) } },
      startTime: { timestampValue: event.getStartTime().toISOString() },
      endTime: { timestampValue: event.getEndTime().toISOString() },
      allDay: { booleanValue: event.isAllDayEvent() },
      category: { stringValue: category },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };
}

function colorToCategory(colorIndex) {
  var map = {
    "1": "appointment",
    "2": "family",
    "3": "family",
    "4": "chug",
    "5": "school",
    "6": "chug",
    "7": "school",
    "8": "appointment",
    "9": "family",
    "10": "school",
    "11": "chug"
  };
  return map[colorIndex] || "family";
}

function getFirestoreToken() {
  var props = PropertiesService.getScriptProperties();
  var saJson = props.getProperty("SERVICE_ACCOUNT_JSON");
  if (!saJson) throw new Error("SERVICE_ACCOUNT_JSON not set in Script Properties");

  var sa = JSON.parse(saJson);
  var now = Math.floor(Date.now() / 1000);

  var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  var claim = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));

  var toSign = header + "." + claim;
  var signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(toSign, sa.private_key)
  );
  var jwt = toSign + "." + signature;

  var response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt
  });

  return JSON.parse(response.getContentText()).access_token;
}

function upsertFirestore(token, collection, docId, data) {
  var url = "https://firestore.googleapis.com/v1/projects/" + FIRESTORE_PROJECT_ID +
    "/databases/(default)/documents/" + collection + "/" + docId;

  UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  });
}
