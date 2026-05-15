import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkPQBeZhIpXZRK4ACppqrR72hCw1lYkbk",
  authDomain: "family-organizer-9b56c.firebaseapp.com",
  projectId: "family-organizer-9b56c",
  storageBucket: "family-organizer-9b56c.firebasestorage.app",
  messagingSenderId: "759974493641",
  appId: "1:759974493641:web:81337d42bc70654a30bc18",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
}
