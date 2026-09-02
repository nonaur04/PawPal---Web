import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

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
    open: { bg: "#FFF3E0", color: "#F5A623", label: "open" },
    pending: { bg: "#FFF3E0", color: "#F5A623", label: "pending" },
    in_progress: { bg: "#FEF9C3", color: "#B45309", label: "in progress" },
    resolved: { bg: "#DCFCE7", color: "#16A34A", label: "resolved" },
  };
  const s = map[status] ?? map.open;
  return (
    <span className="text-sm font-bold px-3 py-1.5 rounded-full shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function StrayReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [userName, setUserName] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserName(u?.displayName || "");
      setCurrentUserId(u?.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const repDoc = await getDoc(doc(db, "stray_reports", id));
        if (!repDoc.exists()) return;
        const data = { id: repDoc.id, ...repDoc.data() };
        setReport(data);
        if (data.assignedShelterId || data.shelterId) {
          const shelterDoc = await getDoc(doc(db, "users", data.assignedShelterId || data.shelterId));
          if (shelterDoc.exists()) setShelter(shelterDoc.data());
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <p style={{ color: "#9B8778" }}>Loading...</p>
    </div>
  );

  if (!report) return (
    <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <p style={{ color: "#9B8778" }}>Report not found.</p>
    </div>
  );

  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photos = report.photoUrls?.length ? report.photoUrls : [null];
  const shelterName = shelter?.name || shelter?.shelterName || shelter?.displayName || "Nearest shelter";
  const isOwn = currentUserId && (report.reporterId === currentUserId || report.userId === currentUserId);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold mb-5" style={{ color: "#6B5E52" }}>
              ‹ Back to Reports
            </button>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left: photos + location map */}
              <div className="flex flex-col gap-4 w-full lg:w-[440px]">
                {/* Main photo */}
                <div className="rounded-2xl overflow-hidden flex items-center justify-center relative"
                  style={{
                    height: 360,
                    backgroundColor: bg,
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)",
                  }}>
                  {photos[activePhoto]
                    ? <img src={photos[activePhoto]} alt="" className="w-full h-full object-cover" />
                    : <span style={{ fontSize: 100 }}>{emoji}</span>
                  }
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>
                      🚨 Stray report
                    </span>
                    {isOwn && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>
                        Your report
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-3">
                  {photos.map((url, i) => (
                    <button key={i} onClick={() => setActivePhoto(i)}
                      className="rounded-xl overflow-hidden flex items-center justify-center flex-1"
                      style={{
                        height: 80,
                        backgroundColor: bg,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)",
                        border: activePhoto === i ? "2.5px solid #F5A623" : "2.5px solid transparent",
                      }}>
                      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 28 }}>{emoji}</span>}
                    </button>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, i) => (
                    <div key={`e-${i}`} className="rounded-xl flex-1"
                      style={{ height: 80, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)", opacity: 0.5 }} />
                  ))}
                </div>

              </div>

              {/* Right: details */}
              <div className="flex-1 min-w-0">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h1 className="text-3xl font-black" style={{ color: "#3D2B1F" }}>
                    {report.title || report.description?.slice(0, 30)}
                  </h1>
                  <StatusBadge status={report.status ?? "open"} />
                </div>
                <p className="text-sm mb-4" style={{ color: "#9B8778" }}>
                  {report.species ? report.species.charAt(0).toUpperCase() + report.species.slice(1) : "Animal"} · Reported {timeAgo(report.createdAt)}
                </p>

                {/* Urgent banner */}
                {report.urgent && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                    style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA" }}>
                    <span>🚨</span>
                    <p className="text-sm font-bold" style={{ color: "#EF4444" }}>Marked urgent — animal may need medical care</p>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>Description</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{report.description}</p>
                </div>

                {/* Location */}
                {(report.address || report.location) && (
                  <div className="rounded-2xl overflow-hidden mb-6 w-full" style={{ backgroundColor: "white", border: "1px solid #EEE8E0", maxWidth: 360 }}>
                    <p className="font-black px-4 pt-4 pb-2" style={{ color: "#3D2B1F" }}>Location</p>
                    {report.location ? (
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${report.location.latitude},${report.location.longitude}&zoom=16&size=600x200&markers=color:red%7C${report.location.latitude},${report.location.longitude}&key=AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8`}
                        alt="map"
                        className="w-full object-cover"
                        style={{ height: 160 }}
                      />
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: 160, backgroundColor: "#F5F2EE" }}>
                        <p className="text-sm" style={{ color: "#9B8778" }}>No location data</p>
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>
                        {report.address || report.location_text || "Location not specified"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assigned shelter */}
                <div>
                  <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Assigned shelter</h3>
                  <div className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: "#FFF3E0" }}>
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{shelterName}</p>
                      <p className="text-xs" style={{ color: "#9B8778" }}>Verified shelter · handling this report</p>
                    </div>
                    <button
                      onClick={() => navigate("/messages")}
                      className="text-sm font-bold px-4 py-2 rounded-xl shrink-0"
                      style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                      Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}