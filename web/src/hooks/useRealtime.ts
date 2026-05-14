import { useEffect, useRef, useState } from "react";
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

  // Serialize constraints so the effect only re-runs when the query actually changes
  const key = constraints.map((c) => JSON.stringify(c)).join("|");
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
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
        console.error(`Firestore error on ${path}:`, err.message);
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  return state;
}
