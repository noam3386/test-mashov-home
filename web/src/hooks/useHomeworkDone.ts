import { where, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useRealtimeCollection } from "./useRealtime";
import { db } from "../firebase";

interface HwDoneTask { id: string; hwId: string; }

export function useHomeworkDone() {
  const { data } = useRealtimeCollection<HwDoneTask>("tasks", [
    where("type", "==", "hw_done"),
  ]);
  const doneIds = new Set(data.map(t => t.hwId));

  async function toggle(hwId: string) {
    const ref = doc(db, "tasks", `hw_done_${hwId}`);
    if (doneIds.has(hwId)) {
      await deleteDoc(ref).catch((e) => { if (e.code !== 'not-found') throw e; });
    } else {
      await setDoc(ref, { type: "hw_done", hwId, doneAt: serverTimestamp() });
    }
  }

  return { doneIds, toggle };
}
