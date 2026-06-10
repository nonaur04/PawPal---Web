import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8",
  authDomain: "pawpal-yana.firebaseapp.com",
  projectId: "pawpal-yana",
  storageBucket: "pawpal-yana.firebasestorage.app",
  messagingSenderId: "914681592582",
  appId: "1:914681592582:web:12ee3ac667c37b83603c87",
  measurementId: "G-VYQ2M4EV2J"
};

const app = initializeApp(firebaseConfig);

export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);