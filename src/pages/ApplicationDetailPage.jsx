import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = {
  dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0",
  bird: "#C4E0F2", others: "#D4F2C4",
};
const SPECIES_EMOJI = {
  dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾",
};

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo${months !== 1 ? "s" : ""}`;
}

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function StatusBadge({ status }) {
  const styles = {
    pending: { bg: "#FFF3E0", color: "#F5A623", label: "Pending review" },
    approved: { bg: "#DCFCE7", color: "#16A34A", label: "Approved ✓" },
    rejected: { bg: "#F5F2EE", color: "#9B8778", label: "Declined" },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ScoreRing({ score }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const filled = circumference - (circumference * score) / 100;
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#F5A623" : "#EF4444";
  const label = score >= 75 ? "Great Match" : score >= 50 ? "Good Fit" : "Low Match";

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EEE8E0" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle"
          style={{ fontSize: 28, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
          {score}
        </text>
        <text x="60" y="74" textAnchor="middle"
          style={{ fontSize: 12, fill: "#9B8778", fontFamily: "'Nunito', sans-serif" }}>
          /100
        </text>
      </svg>
      <p className="font-black text-lg mt-1" style={{ color: "#3D2B1F" }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>Calculated from your screening answers below.</p>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [pet, setPet] = useState(null);
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const appDoc = await getDoc(doc(db, "applications", id));
        if (!appDoc.exists()) return;
        const appData = { id: appDoc.id, ...appDoc.data() };
        setApplication(appData);

        // Fetch pet
        if (appData.petId) {
          const petDoc = await getDoc(doc(db, "pets", appData.petId));
          if (petDoc.exists()) setPet({ id: petDoc.id, ...petDoc.data() });
        }

        // Fetch shelter/owner
        if (appData.ownerId) {
          const ownerDoc = await getDoc(doc(db, "users", appData.ownerId));
          if (ownerDoc.exists()) setShelter(ownerDoc.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <p style={{ color: "#9B8778" }}>Loading...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <p style={{ color: "#9B8778" }}>Application not found.</p>
      </div>
    );
  }

  const bg = SPECIES_BG[pet?.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[pet?.species?.toLowerCase()] ?? "🐾";
  const photo = pet?.photoUrls?.[0] ?? null;
  const age = pet ? formatAge(pet.ageYears, pet.ageMonths) : "";
  const area = pet?.address?.split(",").slice(0, 2).join(",").trim() ?? "";
  const shelterName = shelter?.name || shelter?.shelterName || shelter?.displayName || "Owner";
  const questions = application.questions ?? [];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <button
            onClick={() => navigate("/applications")}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to my applications
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>
                Application for {application.petName}
              </h1>
              <StatusBadge status={application.status} />
            </div>
            <button
              onClick={() => navigate("/messages")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#F5A623" }}
            >
              💬 Chat owner
            </button>
          </div>

          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>
            {shelterName} · Submitted {timeAgo(application.createdAt)}
          </p>

          <div className="flex gap-6">
            {/* Left column */}
            <div className="flex flex-col gap-4" style={{ width: 360 }}>

              {/* Pet photo */}
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  height: 320,
                  backgroundColor: bg,
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)",
                }}
              >
                {photo
                  ? <img src={photo} alt={application.petName} className="w-full h-full object-cover" />
                  : <span style={{ fontSize: 90 }}>{emoji}</span>
                }
              </div>

              {/* Pet info card */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>{pet?.name ?? application.petName}</h2>
                  <span style={{ color: "#9B8778" }}>{pet?.gender === "female" ? "♀" : "♂"}</span>
                </div>
                <p className="text-sm mb-1" style={{ color: "#9B8778" }}>
                  {pet?.breed} · {age}
                </p>
                {area && (
                  <p className="text-sm flex items-center gap-1 mb-4" style={{ color: "#9B8778" }}>
                    📍 {area}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/pet/${application.petId}`)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                >
                  View full pet profile
                </button>
              </div>

              {/* AI score card */}
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="font-black mb-4 text-left" style={{ color: "#3D2B1F" }}>Your AI suitability score</p>
                <ScoreRing score={application.aiScore ?? 0} />
              </div>

              {/* Status note */}
              <div className="rounded-2xl p-4" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>
                  {application.status === "pending"
                    ? `${shelterName} is reviewing your application. You can message them with any questions.`
                    : application.status === "approved"
                    ? `Congratulations! ${shelterName} has approved your application.`
                    : `${shelterName} has reviewed your application and decided not to proceed.`
                  }
                </p>
              </div>
            </div>

            {/* Right column — screening answers */}
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-lg" style={{ color: "#3D2B1F" }}>Your screening answers</h3>
                  <span className="text-sm" style={{ color: "#9B8778" }}>{questions.length} questions</span>
                </div>
                <p className="text-xs mb-6" style={{ color: "#9B8778" }}>
                  These are the answers the owner sees when reviewing your application.
                </p>

                <div className="space-y-4">
                  {questions.map((qa, i) => (
                    <div key={i}>
                      {/* Question */}
                      <div className="flex items-start gap-3 mb-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                          style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}
                        >
                          {i + 1}
                        </span>
                        <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{qa.question}</p>
                      </div>

                      {/* Answer */}
                      <div
                        className="ml-9 flex items-center gap-2 px-4 py-3 rounded-xl"
                        style={{ backgroundColor: "#FFF8F0", border: "1px solid #F5E6CC" }}
                      >
                        <span className="text-sm" style={{ color: "#F5A623" }}>✓</span>
                        <p className="text-sm font-semibold" style={{ color: "#6B5E52" }}>{qa.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}