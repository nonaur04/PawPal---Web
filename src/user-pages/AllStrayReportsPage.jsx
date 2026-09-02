import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0", bird: "#C4E0F2", others: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾" };

// Distance in km between the viewer ({lat,lng}) and a report's GeoPoint ({latitude,longitude}).
// Returns null when either side is missing so the report is kept rather than hidden.
function distanceFromUser(user, geo) {
  if (!user || !geo) return null;
  const lat2 = geo.latitude, lon2 = geo.longitude;
  if (lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - user.lat) * Math.PI / 180;
  const dLon = (lon2 - user.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(user.lat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// A report may store its coordinates in `location` (a GeoPoint) or in `geoPoint`.
// `location` can also be a plain address string, so only use it when it's a GeoPoint object.
function reportGeo(r) {
  if (r.location && typeof r.location === "object" && r.location.latitude != null) return r.location;
  return r.geoPoint || null;
}

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
  return <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

const FILTERS = ["All", "Urgent", "Pending", "In progress", "Resolved"];

function StrayRow({ report, onClick }) {
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
        </div>
        <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "#9B8778" }}>📍 {report.address || report.location_text} · {timeAgo(report.createdAt)}</p>
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
  const [userLocation, setUserLocation] = useState(null);

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

  // Get the viewer's location so we can keep only nearby reports
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  const filtered = reports.filter((r) => {
    // Status/urgent filter
    let matchesFilter = true;
    if (activeFilter === "Urgent") matchesFilter = !!r.urgent;
    else if (activeFilter === "Pending") matchesFilter = r.status === "pending" || r.status === "open" || !r.status;
    else if (activeFilter === "In progress") matchesFilter = r.status === "in_progress";
    else if (activeFilter === "Resolved") matchesFilter = r.status === "resolved";
    if (!matchesFilter) return false;

    // Keep only reports within 30 km (kept when location is unknown)
    const km = distanceFromUser(userLocation, reportGeo(r));
    if (km != null && km > 30) return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <button onClick={() => navigate("/reports")} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>‹ Back to Reports</button>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>All stray reports</h1>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>Community stray reports within 30 km of you</p>
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-2 flex-wrap">
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setActiveFilter(f)} className="px-4 py-2 rounded-full text-sm font-bold transition"
                    style={{ backgroundColor: activeFilter === f ? "#F5A623" : "white", color: activeFilter === f ? "white" : "#6B5E52", border: activeFilter === f ? "none" : "1.5px solid #EEE8E0" }}>
                    {f === "Urgent" ? "🚨 " : ""}{f}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: "#9B8778" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            {loading ? <div className="space-y-3 max-w-3xl">{[1,2,3].map((i) => <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
              : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-3xl mb-3">🐾</p>
                  <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No reports found</p>
                  <p className="text-sm" style={{ color: "#9B8778" }}>Try a different filter</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {filtered.map((r) => <StrayRow key={r.id} report={r} onClick={() => navigate(`/reports/stray/${r.id}`)} />)}
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}