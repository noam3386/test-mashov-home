import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";

interface RealtimeState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useRealtimeCollection<T = DocumentData>(
  path: string,
  constraints: QueryConstraint[] = []
): RealtimeState<T> {
  const [state, setState] = useState<RealtimeState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const q = query(collection(db, path), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)),
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    );
    return unsub;
  }, [path]);

  return state;
}
