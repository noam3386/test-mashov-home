import { getFirestore, Timestamp } from "firebase-admin/firestore";

export const db = () => getFirestore();

export function toTimestamp(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(dateStr));
}

export function normalizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}
