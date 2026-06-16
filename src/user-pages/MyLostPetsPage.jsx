import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0", bird: "#C4E0F2", others: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾" };

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function LostCard({ report, onClick }) {
  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photo = report.photoUrls?.[0] ?? null;
  const isReunited = report.status === "reunited";
  return (
    <div onClick={onClick} className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-sm transition"
      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      <div className="relative flex items-center justify-center"
        style={{ height: 220, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 72 }}>{emoji}</span>}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ backgroundColor: isReunited ? "#DCFCE7" : "#FEE2E2", color: isReunited ? "#16A34A" : "#EF4444" }}>
            {isReunited ? "🏠 REUNITED" : "😿 LOST"}
          </span>
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>You</span>
        </div>
        {report.reward && <span className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>💰 RM {report.reward}</span>}
      </div>
      <div className="p-4">
        <p className="font-black text-base mb-0.5" style={{ color: "#3D2B1F" }}>{report.petName || report.name}</p>
        <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: "#9B8778" }}>{report.breed} · 📍 {report.address || report.location_text}</p>
        <p className="text-xs mb-4" style={{ color: "#9B8778" }}>
          {isReunited ? `Reunited · was lost ${timeAgo(report.createdAt)}` : `Last seen ${timeAgo(report.lastSeenAt || report.createdAt)}`}
        </p>
        <button className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#F5A623" }}>
          Manage post
        </button>
      </div>
    </div>
  );
}

export default function MyLostPetsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUserName(u.displayName || "");
      try {
        const snap = await getDocs(collection(db, "lost_found"));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => (r.type === "lost" || !r.type) && (r.reporterId === u.uid || r.userId === u.uid))
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        setReports(all);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const searching = reports.filter((r) => r.status !== "reunited");
  const reunited = reports.filter((r) => r.status === "reunited");

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <button onClick={() => navigate("/reports")} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>‹ Back to Reports</button>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>Your lost pets</h1>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>You</span>
          </div>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Every lost pet you've posted to the community</p>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl">
            {[{ value: reports.length, label: "Posted" }, { value: searching.length, label: "Searching" }, { value: reunited.length, label: "Reunited" }].map((s) => (
              <div key={s.label} className="rounded-2xl p-5 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="text-3xl font-black mb-1" style={{ color: "#F5A623" }}>{s.value}</p>
                <p className="text-sm" style={{ color: "#9B8778" }}>{s.label}</p>
              </div>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: 340, backgroundColor: "white" }} />)}</div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl p-8 text-center max-w-sm" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="text-3xl mb-3">😿</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No posts yet</p>
              <p className="text-sm mb-4" style={{ color: "#9B8778" }}>Post a lost pet so the community can help.</p>
              <button onClick={() => navigate("/reports/new-lost")} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#F5A623" }}>+ New post</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {reports.map((r) => <LostCard key={r.id} report={r} onClick={() => navigate(`/reports/lost/${r.id}`)} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}