import { FieldValue } from "firebase-admin/firestore";
import { mashovLogin, fetchGrades, fetchMessages, fetchBehavior, mashovLogout } from "./client";
import { db, toTimestamp, normalizeId } from "../lib/firestore";
import { StudentConfig } from "./types";

export async function syncStudent(config: StudentConfig, password: string): Promise<void> {
  const session = await mashovLogin(config.semel, config.username, password, config.year);
  try {
    await Promise.all([
      syncGrades(config.memberId, session),
      syncMessages(config.memberId, session),
      syncBehavior(config.memberId, session),
    ]);
  } finally {
    await mashovLogout(session);
  }
}

async function syncGrades(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const grades = await fetchGrades(session);
  const batch = db().batch();

  for (const g of grades) {
    const docId = `grade_${memberId}_${normalizeId(String(g.gradingEventId))}_${normalizeId(g.eventDate)}`;
    const ref = db().collection("schoolUpdates").doc(docId);
    const snap = await ref.get();
    if (snap.exists) continue;

    batch.set(ref, {
      memberId,
      type: "grade",
      subject: g.subject,
      title: g.title,
      body: "",
      grade: g.grade,
      maxGrade: g.maxGrade,
      weight: g.weight,
      teacherName: g.teacherName,
      eventDate: toTimestamp(g.eventDate),
      fetchedAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}

async function syncMessages(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const messages = await fetchMessages(session);
  const batch = db().batch();

  for (const m of messages) {
    const docId = `msg_${memberId}_${m.id}`;
    const ref = db().collection("schoolUpdates").doc(docId);
    const snap = await ref.get();
    if (snap.exists) continue;

    batch.set(ref, {
      memberId,
      type: "message",
      subject: m.subject,
      title: m.subject,
      body: m.body,
      grade: null,
      maxGrade: null,
      weight: null,
      teacherName: m.senderName,
      eventDate: toTimestamp(m.sendDate),
      fetchedAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}

async function syncBehavior(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const behaviors = await fetchBehavior(session);
  const batch = db().batch();

  for (const b of behaviors) {
    const docId = `behavior_${memberId}_${b.id}`;
    const ref = db().collection("schoolUpdates").doc(docId);
    const snap = await ref.get();
    if (snap.exists) continue;

    batch.set(ref, {
      memberId,
      type: "behavior",
      subject: b.categoryName,
      title: b.categoryName,
      body: b.justification,
      grade: null,
      maxGrade: null,
      weight: null,
      teacherName: b.teacherName,
      eventDate: toTimestamp(b.eventDate),
      fetchedAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}
