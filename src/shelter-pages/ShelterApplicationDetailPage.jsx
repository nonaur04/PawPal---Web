import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F9BFBF", bird: "#C4E0F2", other: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", other: "🐾" };
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

function ScoreRing({ score, size = 96 }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const filled = circ - (circ * score) / 100;
  const color = score >= 80 ? "#16A34A" : score >= 60 ? "#F5A623" : "#EF4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEE8E0" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={filled}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 8} textAnchor="middle"
        style={{ fontSize: size * 0.3, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
        {score}
      </text>
    </svg>
  );
}

function RecommendationBadge({ recommendation, score }) {
  const rec = (recommendation || "").toLowerCase();
  if (rec.includes("approve") || score >= 70) {
    return <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>{recommendation || "Recommended"}</span>;
  }
  if (rec.includes("review") || (score >= 50 && score < 70)) {
    return <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>{recommendation || "Review carefully"}</span>;
  }
  return <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>{recommendation || "Not recommended"}</span>;
}

export default function ShelterApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const appDoc = await getDoc(doc(db, "applications", id));
        if (!appDoc.exists()) return;
        const appData = { id: appDoc.id, ...appDoc.data() };
        setApp(appData);

        const applicantUid = appData.applicantId || appData.userId;
        if (applicantUid) {
          const userDoc = await getDoc(doc(db, "users", applicantUid));
          if (userDoc.exists()) setApplicant(userDoc.data());
        }

        if (appData.petId) {
          const petDoc = await getDoc(doc(db, "pets", appData.petId));
          if (petDoc.exists()) setPet({ id: petDoc.id, ...petDoc.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleAction(action) {
    setActionLoading(true);
    try {
      const status = action === "approve" ? "approved" : "rejected";
      await updateDoc(doc(db, "applications", id), { status });
      setApp((prev) => ({ ...prev, status }));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }

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

  if (!app) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <p style={{ color: "#9B8778" }}>Application not found.</p>
      </div>
    );
  }

  const applicantName = applicant?.fullName || applicant?.name || "Applicant";
  const score = app.aiScore ?? 0;
  const petName = app.petName || pet?.name || "—";
  const petBreed = pet?.breed || "";
  const petAge = pet ? (pet.ageYears > 0 ? `${pet.ageYears} yr${pet.ageYears > 1 ? "s" : ""}` : pet.ageMonths > 0 ? `${pet.ageMonths} mo` : "") : "";
  const speciesKey = (pet?.species || "").toLowerCase();
  const bg = SPECIES_BG[speciesKey] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[speciesKey] ?? "🐾";
  const photo = pet?.photoUrls?.[0];
  const isPending = (app.status || "pending").toLowerCase() === "pending";

  // questions is an array of { question, answer }
  const questionList = app.questions || [];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Back */}
          <button
            onClick={() => navigate("/shelter/applications")}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to applications
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ backgroundColor: "#F59E0B" }}
              >
                {applicantName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>
                  {applicantName}
                </h1>
                <p className="text-sm" style={{ color: "#9B8778" }}>
                  Applying for <span className="font-bold" style={{ color: "#3D2B1F" }}>{petName}</span> · submitted {timeAgo(app.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/shelter/messages?with=${app.applicantId || app.userId}&pet=${petName}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ backgroundColor: "white", border: "1.5px solid #EEE8E0", color: "#6B5E52" }}
              >
                💬 Message
              </button>
              {isPending ? (
                <>
                  <button
                    onClick={() => setConfirmAction("decline")}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold transition"
                    style={{ backgroundColor: "white", border: "1.5px solid #EF4444", color: "#EF4444" }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => setConfirmAction("approve")}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition"
                    style={{ backgroundColor: "#F5A623" }}
                  >
                    Approve
                  </button>
                </>
              ) : (
                <span
                  className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center"
                  style={{
                    backgroundColor: app.status === "approved" ? "#DCFCE7" : "#F3F4F6",
                    color: app.status === "approved" ? "#16A34A" : "#6B7280",
                  }}
                >
                  {app.status === "approved" ? "Approved" : "Declined"}
                </span>
              )}
            </div>
          </div>

          {/* Content grid */}
          <div className="flex gap-5">
            {/* Left column */}
            <div className="flex-1 flex flex-col gap-5">

              {/* AI Suitability Score */}
              <div
                className="rounded-2xl p-6 flex items-center justify-between"
                style={{ backgroundColor: "#FDF1DC", border: "1px solid #F5E6CC" }}
              >
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#9B8778" }}>AI Suitability Score</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black" style={{ color: "#3D2B1F" }}>{score}</span>
                    <span className="text-base font-semibold" style={{ color: "#9B8778" }}>/100</span>
                  </div>
                  <RecommendationBadge recommendation={app.aiRecommendation} score={score} />
                  {app.aiSummary && (
                    <p className="text-sm mt-3 max-w-lg leading-relaxed" style={{ color: "#6B5E52" }}>
                      {app.aiSummary}
                    </p>
                  )}
                </div>
                <ScoreRing score={score} size={96} />
              </div>

              {/* AI Question Responses */}
              {questionList.length > 0 && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <h3 className="font-black mb-4" style={{ color: "#3D2B1F" }}>AI Question Responses</h3>
                  <div className="flex flex-col gap-3">
                    {questionList.map((q, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "#F5F2EE" }}>
                        <p className="text-sm mb-1" style={{ color: "#9B8778" }}>{q.question}</p>
                        <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{q.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5" style={{ width: 320 }}>

              {/* Adopting */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Adopting</h3>
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: bg, backgroundImage: photo ? "none" : STRIPE_BG }}
                  >
                    {photo
                      ? <img src={photo} className="w-full h-full object-cover" alt={petName} />
                      : <span style={{ fontSize: 32 }}>{emoji}</span>
                    }
                  </div>
                  <div>
                    <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{petName}</p>
                    <p className="text-xs mb-1" style={{ color: "#9B8778" }}>
                      {petBreed}{petAge ? ` · ${petAge}` : ""}
                    </p>
                    {pet?.status && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full inline-block"
                        style={{
                          backgroundColor: pet.status === "available" ? "#DCFCE7" : "#F3F4F6",
                          color: pet.status === "available" ? "#16A34A" : "#6B7280",
                        }}
                      >
                        {pet.status.charAt(0).toUpperCase() + pet.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* About the applicant */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>About the applicant</h3>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #F5F2EE" }}>
                  <p className="text-sm" style={{ color: "#9B8778" }}>Email</p>
                  <p className="text-sm font-semibold text-right break-all" style={{ color: "#3D2B1F" }}>
                    {applicant?.email || "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm" style={{ color: "#9B8778" }}>Applicant ID</p>
                  <p className="text-xs font-semibold text-right" style={{ color: "#9B8778" }}>
                    {(app.applicantId || app.userId || "").slice(0, 12)}...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-6 w-80" style={{ backgroundColor: "white" }}>
            <p className="font-black text-base mb-2" style={{ color: "#3D2B1F" }}>
              {confirmAction === "approve" ? `Approve ${applicantName}?` : `Decline ${applicantName}?`}
            </p>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>
              {confirmAction === "approve"
                ? "They will be notified and can proceed with adopting."
                : "They will be notified that their application was declined."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmAction)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: confirmAction === "approve" ? "#F5A623" : "#EF4444" }}
              >
                {actionLoading ? "..." : confirmAction === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}