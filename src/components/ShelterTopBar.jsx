import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export default function ShelterTopBar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserName(snap.data().fullName || snap.data().name || "Manager");
      }
    });
  }, []);

  return (
    <div
      className="flex items-center gap-4 px-6 py-3 bg-white shrink-0"
      style={{ borderBottom: "1px solid #EEE8E0" }}
    >
      {/* Search */}
      <div
        className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}
      >
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
          placeholder="Search pets, applicants, reports..."
        />
      </div>

      {/* Bell */}
      <button
        className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}
      >
        <span>🔔</span>
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ backgroundColor: "#F5A623" }}
        />
      </button>

      {/* User */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: "#F59E0B" }}
        >
          {(userName || "M").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold leading-tight" style={{ color: "#3D2B1F" }}>
            {userName || "Manager"}
          </p>
          <p className="text-xs" style={{ color: "#9B8778" }}>Manager</p>
        </div>
      </div>
    </div>
  );
}