import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

export interface Member {
  id: string;
  name: string;
  role: "parent" | "child";
  color: string;
}

export function useChildMembers(): { members: Member[]; loading: boolean } {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "members"), where("role", "==", "child"));
    return onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member))
      );
      setLoading(false);
    });
  }, []);

  return { members, loading };
}
