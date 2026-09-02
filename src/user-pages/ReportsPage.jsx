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
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function StatusBadge({ status }) {
  const map = {
    open: { bg: "#FFF3E0", color: "#F5A623", label: "open" },
    in_progress: { bg: "#FEF9C3", color: "#B45309", label: "in progress" },
    resolved: { bg: "#DCFCE7", color: "#16A34A", label: "resolved" },
  };
  const s = map[status] ?? map.open;
  return <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

function StrayRow({ report, isOwn, onClick }) {
  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photo = report.photoUrls?.[0] ?? null;
  return (
    <div onClick={onClick} className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer hover:shadow-sm transition"
      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      <div className="rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ width: 72, height: 72, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 32 }}>{emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{report.title || report.description?.slice(0, 30)}</p>
          {report.urgent && <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>🚨 URGENT</span>}
          {isOwn && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F5F2EE", color: "#9B8778" }}>You</span>}
        </div>
        <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "#9B8778" }}>📍 {report.address || report.location_text} · {timeAgo(report.createdAt)}</p>
        <p className="text-sm" style={{ color: "#6B5E52" }}>{report.description}</p>
      </div>
      <StatusBadge status={report.status ?? "open"} />
    </div>
  );
}

function LostCard({ report, isOwn, onClick }) {
  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photo = report.photoUrls?.[0] ?? null;
  return (
    <div onClick={onClick} className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-sm transition w-full sm:w-[320px]"
      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      <div className="relative flex items-center justify-center"
        style={{ height: 200, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 64 }}>{emoji}</span>}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>😿 LOST</span>
          {isOwn && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#F5F2EE", color: "#9B8778" }}>You</span>}
        </div>
        {report.reward && <span className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>💰 RM {report.reward}</span>}
      </div>
      <div className="p-4">
        <p className="font-black text-base mb-0.5" style={{ color: "#3D2B1F" }}>{report.petName || report.name}</p>
        <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: "#9B8778" }}>{report.breed} · 📍 {report.address || report.location_text}</p>
        <p className="text-xs mb-4" style={{ color: "#9B8778" }}>Last seen {timeAgo(report.lastSeenAt || report.createdAt)}</p>
        <button className="w-full py-2.5 rounded-xl text-sm font-bold transition"
          style={isOwn ? { backgroundColor: "#F5A623", color: "white" } : { border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
          {isOwn ? "Manage post" : "More information"}
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stray");
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [myStrayReports, setMyStrayReports] = useState([]);
  const [allStrayReports, setAllStrayReports] = useState([]);
  const [myLostReports, setMyLostReports] = useState([]);
  const [allLostReports, setAllLostReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUser(u); setUserName(u.displayName || "");
      try {
        const straySnap = await getDocs(collection(db, "stray_reports"));
        const allStrays = straySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        setMyStrayReports(allStrays.filter((r) => r.reporterId === u.uid || r.userId === u.uid));
        setAllStrayReports(allStrays.filter((r) => r.reporterId !== u.uid && r.userId !== u.uid));
        const lostSnap = await getDocs(collection(db, "lost_found"));
        const allLost = lostSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.type === "lost" || !r.type)
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        setMyLostReports(allLost.filter((r) => r.reporterId === u.uid || r.userId === u.uid));
        setAllLostReports(allLost.filter((r) => r.reporterId !== u.uid && r.userId !== u.uid));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const tabs = [
    { key: "stray", label: "Stray reports", emoji: "🚨" },
    { key: "lost", label: "Lost", emoji: "😿" },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Reports</h1>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>Help strays, post lost pets, celebrate reunions</p>

            <div className="mb-6" style={{ display: "inline-flex", padding: 4, borderRadius: 16, backgroundColor: "#EEEBE6" }}>
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition"
                  style={{ borderRadius: 12, backgroundColor: activeTab === tab.key ? "white" : "transparent", color: activeTab === tab.key ? "#F5A623" : "#9B8778", boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "stray" && (
              <div className="max-w-5xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-4 rounded-2xl mb-6" style={{ backgroundColor: "#FFF3E0", border: "1px solid #F5E6CC" }}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🚨</span>
                    <div><p className="font-black text-sm" style={{ color: "#3D2B1F" }}>Spotted a stray?</p><p className="text-xs" style={{ color: "#9B8778" }}>Report it — the nearest shelter will respond.</p></div>
                  </div>
                  <button onClick={() => navigate("/reports/new-stray")} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 w-full sm:w-auto" style={{ backgroundColor: "#F5A623" }}>+ New report</button>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div><h2 className="font-black text-lg" style={{ color: "#3D2B1F" }}>Your Reports</h2><p className="text-xs" style={{ color: "#9B8778" }}>Strays you've reported</p></div>
                    <button onClick={() => navigate("/reports/my-strays")} className="text-sm font-bold flex items-center gap-1 shrink-0" style={{ color: "#F5A623" }}>View all ›</button>
                  </div>
                  {loading ? <div className="space-y-3">{[1,2].map((i) => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
                    : myStrayReports.length === 0 ? <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}><p className="text-sm" style={{ color: "#9B8778" }}>You haven't reported any strays yet.</p></div>
                    : <div className="space-y-3">{myStrayReports.map((r) => <StrayRow key={r.id} report={r} isOwn={true} onClick={() => navigate(`/reports/stray/${r.id}`)} />)}</div>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div><h2 className="font-black text-lg" style={{ color: "#3D2B1F" }}>All Reports</h2><p className="text-xs" style={{ color: "#9B8778" }}>Community stray reports nearby</p></div>
                    <button onClick={() => navigate("/reports/all-strays")} className="text-sm font-bold flex items-center gap-1 shrink-0" style={{ color: "#F5A623" }}>View all ›</button>
                  </div>
                  {loading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
                    : allStrayReports.length === 0 ? <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}><p className="text-sm" style={{ color: "#9B8778" }}>No community reports yet.</p></div>
                    : <div className="space-y-3">{allStrayReports.map((r) => <StrayRow key={r.id} report={r} isOwn={false} onClick={() => navigate(`/reports/stray/${r.id}`)} />)}</div>}
                </div>
              </div>
            )}

            {activeTab === "lost" && (
              <div className="max-w-5xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-4 rounded-2xl mb-6" style={{ backgroundColor: "#FFF3E0", border: "1px solid #F5E6CC" }}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🔍</span>
                    <div><p className="font-black text-sm" style={{ color: "#3D2B1F" }}>Lost your pet?</p><p className="text-xs" style={{ color: "#9B8778" }}>Post a description so the community can help.</p></div>
                  </div>
                  <button onClick={() => navigate("/reports/new-lost")} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 w-full sm:w-auto" style={{ backgroundColor: "#F5A623" }}>+ New post</button>
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div><h2 className="font-black text-lg" style={{ color: "#3D2B1F" }}>Your Reports</h2><p className="text-xs" style={{ color: "#9B8778" }}>Lost pets you've posted</p></div>
                    <button onClick={() => navigate("/reports/my-lost")} className="text-sm font-bold flex items-center gap-1 shrink-0" style={{ color: "#F5A623" }}>View all ›</button>
                  </div>
                  {loading ? <div className="flex gap-4">{[1,2].map((i) => <div key={i} className="rounded-2xl animate-pulse w-full sm:w-[320px]" style={{ height: 340, backgroundColor: "white" }} />)}</div>
                    : myLostReports.length === 0 ? <div className="rounded-2xl p-6 text-center max-w-xs" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}><p className="text-sm" style={{ color: "#9B8778" }}>You haven't posted any lost pets yet.</p></div>
                    : <div className="flex gap-4 flex-wrap">{myLostReports.map((r) => <LostCard key={r.id} report={r} isOwn={true} onClick={() => navigate(`/reports/lost/${r.id}`)} />)}</div>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div><h2 className="font-black text-lg" style={{ color: "#3D2B1F" }}>All Reports</h2><p className="text-xs" style={{ color: "#9B8778" }}>Lost pets posted by the community</p></div>
                    <button onClick={() => navigate("/reports/all-lost")} className="text-sm font-bold flex items-center gap-1 shrink-0" style={{ color: "#F5A623" }}>View all ›</button>
                  </div>
                  {loading ? <div className="flex gap-4">{[1,2,3].map((i) => <div key={i} className="rounded-2xl animate-pulse w-full sm:w-[320px]" style={{ height: 340, backgroundColor: "white" }} />)}</div>
                    : allLostReports.length === 0 ? <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}><p className="text-sm" style={{ color: "#9B8778" }}>No community lost pet posts yet.</p></div>
                    : <div className="flex gap-4 flex-wrap">{allLostReports.map((r) => <LostCard key={r.id} report={r} isOwn={false} onClick={() => navigate(`/reports/lost/${r.id}`)} />)}</div>}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}