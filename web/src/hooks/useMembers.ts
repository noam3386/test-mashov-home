import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useFamilyId } from "../context/FamilyContext";

export interface Member {
  id: string;
  name: string;
  role: "parent" | "child";
  color: string;
}

export function useChildMembers(): { members: Member[]; loading: boolean } {
  const familyId = useFamilyId();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, `families/${familyId}/members`),
      where("role", "==", "child")
    );
    return onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member)));
      setLoading(false);
    });
  }, [familyId]);

  return { members, loading };
}
