import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const TABS = ["All", "Pending", "In progress", "Resolved"];

const ANIMAL_EMOJI = {
  cat: "🐱", dog: "🐕", rabbit: "🐇", bird: "🐦", other: "🐾",
};
const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function distanceKm(geoA, geoB) {
  if (!geoA || !geoB) return null;
  const lat1 = geoA.latitude, lon1 = geoA.longitude;
  const lat2 = geoB.latitude, lon2 = geoB.longitude;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// A report (or a shelter's own profile) may store coordinates in `location` (a GeoPoint)
// or in `geoPoint`. `location` can also be a plain address string, so only use it when
// it's a GeoPoint object.
function resolveGeo(obj) {
  if (obj?.location && typeof obj.location === "object" && obj.location.latitude != null) return obj.location;
  return obj?.geoPoint || null;
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: "#FEF3C7", color: "#92400E", label: "pending" },
    "in progress": { bg: "#FEF3C7", color: "#92400E", label: "in progress" },
    resolved: { bg: "#DCFCE7", color: "#16A34A", label: "resolved" },
  };
  const s = map[(status || "pending").toLowerCase()] || map.pending;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function ShelterStrayReportsPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [reports, setReports] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [shelterGeo, setShelterGeo] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    try {
      // Get shelter's own location for distance calc (optional)
      const shelterDoc = await getDoc(doc(db, "users", user.uid));
      let myGeo = null;
      if (shelterDoc.exists()) {
        myGeo = resolveGeo(shelterDoc.data());
      }
      setShelterGeo(myGeo);

      const snap = await getDocs(
        query(collection(db, "stray_reports"), orderBy("createdAt", "desc"))
      );
      const allReports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(allReports);

      // Fetch reporter names
      const reporterIds = [...new Set(allReports.map((r) => r.reporterId).filter(Boolean))];
      const um = {};
      await Promise.all(reporterIds.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) um[uid] = snap.data();
        } catch (_) {}
      }));
      setUserMap(um);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Only reports within 30 km of the shelter. Reports with no geoPoint, or when
  // the shelter has no saved location, are kept so nothing silently disappears.
  const nearbyReports = reports.filter((r) => {
    const km = distanceKm(shelterGeo, resolveGeo(r));
    return km == null || km <= 30;
  });

  const filtered = activeTab === "All"
    ? nearbyReports
    : nearbyReports.filter((r) => (r.status || "pending").toLowerCase() === activeTab.toLowerCase());

  const tabCounts = {
    All: nearbyReports.length,
    Pending: nearbyReports.filter((r) => (r.status || "pending").toLowerCase() === "pending").length,
    "In progress": nearbyReports.filter((r) => (r.status || "").toLowerCase() === "in progress").length,
    Resolved: nearbyReports.filter((r) => (r.status || "").toLowerCase() === "resolved").length,
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Stray Reports Inbox</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>
            Reports {shelterGeo ? "near your shelter" : "from the community"}
          </p>

          {/* Tabs */}
          <div className="mb-5" style={{ display: "inline-flex", padding: 4, borderRadius: 16, backgroundColor: "#EEEBE6" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition"
                style={{
                  borderRadius: 12,
                  backgroundColor: activeTab === tab ? "white" : "transparent",
                  color: activeTab === tab ? "#F5A623" : "#9B8778",
                  boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {tab}
                <span
                  className="text-xs font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: activeTab === tab ? "#FFF3E0" : "rgba(0,0,0,0.06)",
                    color: activeTab === tab ? "#F5A623" : "#9B8778",
                  }}
                >
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="text-3xl mb-3">🐾</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No reports here</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>
                {activeTab === "All" ? "Stray reports will appear here as the community submits them." : `No ${activeTab.toLowerCase()} reports.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((r) => {
                const reporter = userMap[r.reporterId] || {};
                const reporterName = reporter.fullName || reporter.name || "Anonymous";
                const emoji = ANIMAL_EMOJI[(r.animalType || "").toLowerCase()] || "🐾";
                const km = distanceKm(shelterGeo, resolveGeo(r));
                const assignedToName = r.assignedToName || (r.assignedTo ? "Team member" : null);

                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-4 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                    onClick={() => navigate(`/shelter/stray-reports/${r.id}`)}
                  >
                    {/* Photo */}
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: "#F9C4B0", backgroundImage: r.photoUrl ? "none" : STRIPE_BG }}
                    >
                      {r.photoUrl
                        ? <img src={r.photoUrl} className="w-full h-full object-cover" alt={r.title} />
                        : <span style={{ fontSize: 36 }}>{emoji}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{r.title || "Stray report"}</p>
                        {r.isUrgent && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                            🔔 URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#9B8778" }}>
                        📍 {typeof r.location === "string" ? r.location : "Unknown location"}{km != null ? ` · ${km.toFixed(1)} km away` : ""}
                      </p>
                      <p className="text-sm mb-3" style={{ color: "#6B5E52" }}>{r.description}</p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "#9B8778" }}>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                          style={{ backgroundColor: "#F59E0B", fontSize: 10 }}
                        >
                          {reporterName.charAt(0).toUpperCase()}
                        </div>
                        <span>by {reporterName}</span>
                        <span>·</span>
                        <span>{timeAgo(r.createdAt)}</span>
                        {assignedToName && (
                          <>
                            <span>·</span>
                            <span>Assigned to <span className="font-bold" style={{ color: "#3D2B1F" }}>{assignedToName}</span></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side: status */}
                    <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}