import { FieldValue } from "firebase-admin/firestore";
import {
  mashovLogin, fetchGrades, fetchMessages, fetchBehavior,
  fetchHomework, fetchHatamot, fetchTimetable, mashovLogout,
} from "./client";
import { db, toTimestamp, normalizeId } from "../lib/firestore";
import { StudentConfig } from "./types";

export async function syncStudent(config: StudentConfig): Promise<void> {
  const session = await mashovLogin(config.semel, config.username, config.password, config.year);
  try {
    await Promise.allSettled([
      syncGrades(config.memberId, session),
      syncMessages(config.memberId, session),
      syncBehavior(config.memberId, session),
      syncHomework(config.memberId, session),
      syncHatamot(config.memberId, session),
      syncTimetable(config.memberId, session),
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
      teacherName: m.senderName,
      eventDate: toTimestamp(m.sendDate),
      fetchedAt: FieldValue.serverTimestamp(),
      read: m.isRead,
    });
  }

  await batch.commit();
}

async function syncBehavior(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const behaviors = await fetchBehavior(session);
  const batch = db().batch();

  for (const b of behaviors) {
    const dateKey = (b.timestamp ?? b.lessonDate ?? b.eventDate ?? "").slice(0, 10);
    const docId = `behave_${memberId}_${b.lessonId ?? b.groupId ?? b.id}_${normalizeId(dateKey)}`;
    const ref = db().collection("schoolUpdates").doc(docId);
    const snap = await ref.get();
    if (snap.exists) continue;

    batch.set(ref, {
      memberId,
      type: "behavior",
      eventCode: b.eventCode ?? 0,
      categoryName: b.categoryName ?? b.eventType ?? "",
      justified: b.justified ?? -1,
      groupId: b.groupId ?? null,
      teacherName: b.reporterName ?? b.teacherName ?? "",
      eventDate: toTimestamp(b.timestamp ?? b.lessonDate ?? b.eventDate),
      fetchedAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}

async function syncHomework(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const homework = await fetchHomework(session);

  // Get existing IDs to skip already-synced items
  const existingSnap = await db().collection("schoolUpdates")
    .where("memberId", "==", memberId)
    .where("type", "==", "homework")
    .select()
    .get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  const batch = db().batch();
  for (const h of homework) {
    const docId = `hw_${memberId}_${h.lessonId}`;
    if (existingIds.has(docId)) continue;

    batch.set(db().collection("schoolUpdates").doc(docId), {
      memberId,
      type: "homework",
      subject: h.subjectName ?? "",
      title: h.subjectName ?? "",
      body: h.homework ?? "",
      remark: h.remark ?? "",
      teacherName: h.teacherName ?? "",
      eventDate: new Date(h.lessonDate ?? Date.now()),
      fetchedAt: FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}

async function syncHatamot(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const hatamot = await fetchHatamot(session);
  const batch = db().batch();

  for (const item of hatamot) {
    const docId = `hat_${memberId}_${normalizeId(item.code ?? item.name?.slice(0, 10) ?? "x")}`;
    batch.set(db().collection("schoolUpdates").doc(docId), {
      memberId,
      type: "hatamot",
      title: item.name ?? "",
      body: item.remark ?? "",
      eventDate: new Date(),
      fetchedAt: FieldValue.serverTimestamp(),
      read: true,
    });
  }

  await batch.commit();
}

async function syncTimetable(memberId: string, session: Awaited<ReturnType<typeof mashovLogin>>) {
  const entries = await fetchTimetable(session);
  const batch = db().batch();

  for (const entry of entries) {
    const tt = entry.timeTable ?? entry as any;
    const gd = entry.groupDetails ?? {} as any;
    const docId = `tt_${memberId}_d${tt.day}_l${tt.lesson}`;

    batch.set(db().collection("timetable").doc(docId), {
      memberId,
      day: tt.day - 1,
      lesson: tt.lesson,
      roomNum: tt.roomNum ?? "",
      subjectName: gd.subjectName ?? tt.subjectName ?? "",
      groupName: gd.groupName ?? "",
      teacherName: gd.groupTeachers?.[0]?.teacherName ?? "",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}
