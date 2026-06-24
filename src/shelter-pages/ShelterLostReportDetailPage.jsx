import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

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

export default function ShelterLostReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const repDoc = await getDoc(doc(db, "lost_found", id));
        if (!repDoc.exists()) return;
        const data = { id: repDoc.id, ...repDoc.data() };
        setReport(data);

        const ownerUid = data.userId || data.reporterId;
        if (ownerUid) {
          const userDoc = await getDoc(doc(db, "users", ownerUid));
          if (userDoc.exists()) setOwner(userDoc.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <p style={{ color: "#9B8778" }}>Report not found.</p>
      </div>
    );
  }

  const bg = SPECIES_BG[report.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[report.species?.toLowerCase()] ?? "🐾";
  const photos = report.photoUrls?.length ? report.photoUrls : (report.photoUrl ? [report.photoUrl] : [null]);
  const isReunited = (report.status || "").toLowerCase() === "reunited" || (report.status || "").toLowerCase() === "found";
  const ownerUid = report.userId || report.reporterId;
  const ownerName = owner?.fullName || owner?.name || "Community member";
  const lat = report.geoPoint?.latitude ?? report.location?.latitude;
  const lng = report.geoPoint?.longitude ?? report.location?.longitude;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          <button
            onClick={() => navigate("/shelter/lost-pets")}
            className="flex items-center gap-1 text-sm font-semibold mb-5"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to Lost Pets
          </button>

          <div className="flex gap-8">
            {/* Left: photos + location */}
            <div className="flex flex-col gap-4" style={{ width: 440 }}>
              {/* Main photo */}
              <div className="rounded-2xl overflow-hidden flex items-center justify-center relative"
                style={{ height: 360, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)" }}>
                {photos[activePhoto] ? <img src={photos[activePhoto]} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 100 }}>{emoji}</span>}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: isReunited ? "#DCFCE7" : "#FEE2E2", color: isReunited ? "#16A34A" : "#EF4444" }}>
                    {isReunited ? "🏠 Reunited" : "😿 Lost pet"}
                  </span>
                </div>
                {report.reward && (
                  <span className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>
                    💰 RM {report.reward}
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-3">
                  {photos.map((url, i) => (
                    <button key={i} onClick={() => setActivePhoto(i)}
                      className="rounded-xl overflow-hidden flex items-center justify-center flex-1"
                      style={{ height: 80, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)", border: activePhoto === i ? "2.5px solid #F5A623" : "2.5px solid transparent" }}>
                      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 28 }}>{emoji}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Location */}
              {(lat && lng) && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black px-4 pt-4 pb-2" style={{ color: "#3D2B1F" }}>Location</p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x200&markers=color:orange%7C${lat},${lng}&key=AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8`}
                      alt="map" className="w-full object-cover hover:opacity-90 transition-opacity" style={{ height: 160 }}
                    />
                  </a>
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>
                      {report.lastSeenLocation || report.address || "Location not specified"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: details */}
            <div className="flex-1 min-w-0">
              {/* Name + status */}
              <div className="flex items-start justify-between mb-1">
                <h1 className="text-3xl font-black" style={{ color: "#3D2B1F" }}>{report.petName || report.name}</h1>
                <span className="text-sm font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: isReunited ? "#DCFCE7" : "#FEE2E2", color: isReunited ? "#16A34A" : "#EF4444" }}>
                  {isReunited ? "Reunited 🎉" : "Lost"}
                </span>
              </div>
              <p className="text-sm mb-5" style={{ color: "#9B8778" }}>
                {report.appearance || report.breed} · {report.species ? report.species.charAt(0).toUpperCase() + report.species.slice(1) : ""} · Lost {timeAgo(report.createdAt)}
              </p>

              {/* Description */}
              <div className="mb-5">
                <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>Details from the owner</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{report.description}</p>
              </div>

              {/* About grid */}
              <div className="mb-5">
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>About {report.petName || report.name}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Species", value: report.species ? report.species.charAt(0).toUpperCase() + report.species.slice(1) : "—" },
                    { label: "Appearance", value: report.appearance || report.breed || "—" },
                    { label: "Last seen", value: timeAgo(report.lastSeenAt || report.createdAt) },
                    { label: "Reward", value: report.reward ? `RM ${report.reward}` : "None" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                      <p className="text-xs mb-1" style={{ color: "#9B8778" }}>{s.label}</p>
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Posted by */}
              <div className="mb-5">
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Posted by</h3>
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-3" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: "#F59E0B" }}
                  >
                    {ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{ownerName}</p>
                    <p className="text-xs" style={{ color: "#9B8778" }}>Owner</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Lost: ${report.petName || "Pet"}`,
                          text: `Help find ${report.petName || "this pet"} — last seen near ${report.lastSeenLocation || report.address || "Melaka"}.`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="px-6 py-3.5 rounded-xl text-sm font-bold transition"
                    style={{ border: "1.5px solid #EEE8E0", color: "#3D2B1F", backgroundColor: "white" }}
                  >
                    Share
                  </button>
                  {!isReunited && (
                    <button
                      onClick={() => navigate(`/shelter/messages?with=${ownerUid}&pet=${report.petName || ""}`)}
                      className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition"
                      style={{ backgroundColor: "#F5A623" }}
                    >
                      Contact {ownerName.split(" ")[0]}
                    </button>
                  )}
                </div>
              </div>

              {isReunited && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#DCFCE7", border: "1px solid #86EFAC" }}>
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-black text-sm" style={{ color: "#16A34A" }}>{report.petName || report.name} has been found!</p>
                    <p className="text-xs" style={{ color: "#16A34A" }}>This post is now closed.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}