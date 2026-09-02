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

const FILTERS = ["All", "With reward", "No reward"];

function LostCard({ report, onClick }) {
  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photo = report.photoUrls?.[0] ?? null;
  return (
    <div onClick={onClick} className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-sm transition"
      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      <div className="relative flex items-center justify-center"
        style={{ height: 220, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)" }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 72 }}>{emoji}</span>}
        <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>😿 LOST</span>
        {report.reward && <span className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>💰 RM {report.reward}</span>}
      </div>
      <div className="p-4">
        <p className="font-black text-base mb-0.5" style={{ color: "#3D2B1F" }}>{report.petName || report.name}</p>
        <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: "#9B8778" }}>{report.breed} · 📍 {report.address || report.location_text}</p>
        <p className="text-xs mb-4" style={{ color: "#9B8778" }}>Last seen {timeAgo(report.lastSeenAt || report.createdAt)}</p>
        <button className="w-full py-2.5 rounded-xl text-sm font-bold transition"
          style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
          More information
        </button>
      </div>
    </div>
  );
}

export default function AllLostPetsPage() {
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
        const snap = await getDocs(collection(db, "lost_found"));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => (r.type === "lost" || !r.type) && r.reporterId !== u.uid && r.userId !== u.uid)
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
    // Reward filter
    if (activeFilter === "With reward" && !r.reward) return false;
    if (activeFilter === "No reward" && r.reward) return false;

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <button onClick={() => navigate("/reports")} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>‹ Back to Reports</button>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>All lost pets</h1>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>Lost pets posted by the community within 30 km of you</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex gap-2 flex-wrap">
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setActiveFilter(f)} className="px-4 py-2 rounded-full text-sm font-bold transition"
                    style={{ backgroundColor: activeFilter === f ? "#F5A623" : "white", color: activeFilter === f ? "white" : "#6B5E52", border: activeFilter === f ? "none" : "1.5px solid #EEE8E0" }}>
                    {f === "With reward" ? "💰 " : ""}{f}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: "#9B8778" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: 340, backgroundColor: "white" }} />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-3xl mb-3">😿</p>
                <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No lost pets found</p>
                <p className="text-sm" style={{ color: "#9B8778" }}>Try a different filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((r) => <LostCard key={r.id} report={r} onClick={() => navigate(`/reports/lost/${r.id}`)} />)}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}