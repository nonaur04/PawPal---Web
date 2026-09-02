import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const TABS = ["All", "Urgent", "Cats", "Dogs"];

const SPECIES_EMOJI = { cat: "🐱", dog: "🐕", rabbit: "🐇", bird: "🐦", other: "🐾" };
const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 2) return `${days} day ago`;
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
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

export default function ShelterLostPetsPage() {
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
      const shelterDoc = await getDoc(doc(db, "users", user.uid));
      let myGeo = null;
      if (shelterDoc.exists()) {
        myGeo = resolveGeo(shelterDoc.data());
      }
      setShelterGeo(myGeo);

      const snap = await getDocs(
        query(collection(db, "lost_found"), where("type", "==", "lost"))
      );
      let allReports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      allReports.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });
      setReports(allReports);

      const userIds = [...new Set(allReports.map((r) => r.userId).filter(Boolean))];
      const um = {};
      await Promise.all(userIds.map(async (uid) => {
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

  const filtered = nearbyReports.filter((r) => {
    const species = (r.species || "").toLowerCase();
    if (activeTab === "Urgent") return r.isUrgent;
    if (activeTab === "Cats") return species === "cat";
    if (activeTab === "Dogs") return species === "dog";
    return true;
  });

  const tabCounts = {
    All: nearbyReports.length,
    Urgent: nearbyReports.filter((r) => r.isUrgent).length,
    Cats: nearbyReports.filter((r) => (r.species || "").toLowerCase() === "cat").length,
    Dogs: nearbyReports.filter((r) => (r.species || "").toLowerCase() === "dog").length,
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

          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Lost Pet Reports</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>
            Owner reports {shelterGeo ? "near your shelter" : "from the community"}. Spotted one? Message the owner to help reunite them.
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

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="text-3xl mb-3">🐾</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No lost pet reports</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>
                {activeTab === "All" ? "Reports will appear here when owners post a lost pet." : `No ${activeTab.toLowerCase()} reports right now.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map((r) => {
                const owner = userMap[r.userId] || {};
                const ownerName = owner.fullName || owner.name || "Owner";
                const species = (r.species || "").toLowerCase();
                const emoji = SPECIES_EMOJI[species] || "🐾";
                const hasPhoto = (r.photoUrls?.length > 0) || r.photoUrl;
                const photo = r.photoUrls?.[0] || r.photoUrl;
                const km = distanceKm(shelterGeo, resolveGeo(r));
                const isSearching = (r.status || "active").toLowerCase() !== "found" && (r.status || "").toLowerCase() !== "reunited";

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-lg"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                    onClick={() => navigate(`/shelter/lost-pets/${r.id}`)}
                  >
                    {/* Photo area */}
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        height: 220,
                        backgroundColor: "#F9C4B0",
                        backgroundImage: hasPhoto ? "none" : STRIPE_BG,
                      }}
                    >
                      {hasPhoto ? (
                        <img src={photo} className="w-full h-full object-cover" alt={r.petName} />
                      ) : (
                        <span style={{ fontSize: 72 }}>{emoji}</span>
                      )}

                      {/* Top-left status / urgent */}
                      <div className="absolute top-3 left-3">
                        {r.isUrgent ? (
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                            🔔 URGENT
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                            {isSearching ? "Searching" : "Found"}
                          </span>
                        )}
                      </div>

                      {/* Top-right reward */}
                      {r.reward && (
                        <div className="absolute top-3 right-3">
                          <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 bg-white" style={{ color: "#3D2B1F" }}>
                            🎁 RM {r.reward}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{r.petName || "Unknown"}</p>
                        {r.appearance && (
                          <span className="text-sm" style={{ color: "#9B8778" }}>{r.appearance}</span>
                        )}
                      </div>
                      <p className="text-xs mb-3" style={{ color: "#9B8778" }}>
                        📍 {r.lastSeenLocation || "Unknown location"}{km != null ? ` · ${km.toFixed(1)} km away` : ""}
                      </p>
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: "#6B5E52" }}>{r.description}</p>

                      <div
                        className="flex items-center justify-between pt-3"
                        style={{ borderTop: "1px solid #F5F2EE" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#9B8778" }}>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                            style={{ backgroundColor: "#F59E0B", fontSize: 10 }}
                          >
                            {ownerName.charAt(0).toUpperCase()}
                          </div>
                          <span>{ownerName} · lost {timeAgo(r.createdAt)}</span>
                        </div>
                        <button
                          onClick={() => navigate(`/shelter/lost-pets/${r.id}`)}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition"
                          style={{ border: "1.5px solid #EEE8E0", color: "#3D2B1F", backgroundColor: "white" }}
                        >
                          Help find
                        </button>
                      </div>
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