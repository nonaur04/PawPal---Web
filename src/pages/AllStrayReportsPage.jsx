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

function StatusBadge({ status }) {
  const map = {
    open: { bg: "#FEE2E2", color: "#EF4444", label: "pending" },
    pending: { bg: "#FEE2E2", color: "#EF4444", label: "pending" },
    in_progress: { bg: "#FEF9C3", color: "#B45309", label: "in progress" },
    resolved: { bg: "#DCFCE7", color: "#16A34A", label: "resolved" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const FILTERS = ["All", "Urgent", "Pending", "In progress", "Resolved"];

function StrayRow({ report }) {
  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photo = report.photoUrls?.[0] ?? null;

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      <div className="rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ width: 72, height: 72, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 32 }}>{emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{report.title || report.description?.slice(0, 30)}</p>
          {report.urgent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>🚨 URGENT</span>
          )}
        </div>
        <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "#9B8778" }}>
          📍 {report.address || report.location_text} · {timeAgo(report.createdAt)}
        </p>
        <p className="text-sm" style={{ color: "#6B5E52" }}>{report.description}</p>
      </div>
      <StatusBadge status={report.status ?? "pending"} />
    </div>
  );
}

export default function AllStrayReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUserName(u.displayName || "");
      try {
        const snap = await getDocs(collection(db, "stray_reports"));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.reporterId !== u.uid && r.userId !== u.uid)
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        setReports(all);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const filtered = reports.filter((r) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Urgent") return r.urgent;
    if (activeFilter === "Pending") return r.status === "pending" || r.status === "open" || !r.status;
    if (activeFilter === "In progress") return r.status === "in_progress";
    if (activeFilter === "Resolved") return r.status === "resolved";
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <button onClick={() => navigate("/reports")} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>
            ‹ Back to Reports
          </button>

          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>All stray reports</h1>
          <p className="text-sm mb-5" style={{ color: "#9B8778" }}>All community stray reports near Melaka</p>

          {/* Filters */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className="px-4 py-2 rounded-full text-sm font-bold transition"
                  style={{
                    backgroundColor: activeFilter === f ? "#F5A623" : "white",
                    color: activeFilter === f ? "white" : "#6B5E52",
                    border: activeFilter === f ? "none" : "1.5px solid #EEE8E0",
                  }}>
                  {f === "Urgent" ? "🚨 " : ""}{f}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold shrink-0" style={{ color: "#9B8778" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3 max-w-3xl">
              {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ backgroundColor: "white" }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-3xl mb-3">🐾</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No reports found</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>Try a different filter</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {filtered.map((r) => <StrayRow key={r.id} report={r} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}