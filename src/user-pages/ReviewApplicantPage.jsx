import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0", bird: "#C4E0F2", others: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾" };

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function ScoreRing({ score }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = circ - (circ * score) / 100;
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#F5A623" : "#EF4444";
  const label = score >= 75 ? "Highly recommended" : score >= 50 ? "Good fit" : "Low match";
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEE8E0" strokeWidth="8" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={filled}
          transform="rotate(-90 70 70)" />
        <text x="70" y="65" textAnchor="middle" style={{ fontSize: 36, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>{score}</text>
        <text x="70" y="85" textAnchor="middle" style={{ fontSize: 13, fill: "#9B8778", fontFamily: "'Nunito', sans-serif" }}>/100</text>
      </svg>
      <p className="font-black text-lg mt-1" style={{ color: "#3D2B1F" }}>{label}</p>
      <p className="text-xs mt-0.5 text-center" style={{ color: "#9B8778" }}>Calculated from {"{name}"}'s screening answers.</p>
    </div>
  );
}

export default function ReviewApplicantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [pet, setPet] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // "approve" | "decline"
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserName(u?.displayName || ""));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const appDoc = await getDoc(doc(db, "applications", id));
        if (!appDoc.exists()) return;
        const data = { id: appDoc.id, ...appDoc.data() };
        setApp(data);
        if (data.petId) {
          const pd = await getDoc(doc(db, "pets", data.petId));
          if (pd.exists()) setPet({ id: pd.id, ...pd.data() });
        }
        if (data.applicantId) {
          const ud = await getDoc(doc(db, "users", data.applicantId));
          if (ud.exists()) setApplicant({ id: ud.id, ...ud.data() });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleDecision = async (decision) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "applications", id), {
        status: decision === "approve" ? "approved" : "rejected",
      });
      setApp((prev) => ({ ...prev, status: decision === "approve" ? "approved" : "rejected" }));
      setConfirm(null);
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <p style={{ color: "#9B8778" }}>Loading...</p>
    </div>
  );

  if (!app) return (
    <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <p style={{ color: "#9B8778" }}>Application not found.</p>
    </div>
  );

  const applicantName = applicant?.name || applicant?.displayName || "Applicant";
  const bg = SPECIES_BG[pet?.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[pet?.species?.toLowerCase()] ?? "🐾";
  const questions = app.questions ?? [];
  const isPending = app.status === "pending";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            <button onClick={() => navigate("/applications")} className="flex items-center gap-1 text-sm font-semibold mb-5" style={{ color: "#6B5E52" }}>
              ‹ Back to applicants
            </button>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: "#FFF3E0" }}>👤</div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{applicantName}</h1>
                    <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: isPending ? "#FFF3E0" : app.status === "approved" ? "#DCFCE7" : "#F5F2EE",
                        color: isPending ? "#F5A623" : app.status === "approved" ? "#16A34A" : "#9B8778",
                      }}>
                      {isPending ? "Pending your review" : app.status === "approved" ? "Approved ✓" : "Declined"}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "#9B8778" }}>
                    Applied for <span className="font-bold" style={{ color: "#3D2B1F" }}>{app.petName}</span> · {timeAgo(app.createdAt)}
                  </p>
                </div>
              </div>
              <button onClick={() => navigate(`/messages?with=${app.applicantId}&pet=${encodeURIComponent(app.petName)}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                💬 Chat applicant
              </button>
            </div>

            <div className="flex gap-6">
              {/* Left */}
              <div className="flex flex-col gap-4" style={{ width: 320 }}>
                {/* Score card */}
                <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-4 text-left" style={{ color: "#3D2B1F" }}>AI suitability score</p>
                  <div className="flex flex-col items-center">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const score = app.aiScore ?? 0;
                        const r = 52; const circ = 2 * Math.PI * r;
                        const filled = circ - (circ * score) / 100;
                        const color = score >= 75 ? "#16A34A" : score >= 50 ? "#F5A623" : "#EF4444";
                        return <>
                          <circle cx="70" cy="70" r={r} fill="none" stroke="#EEE8E0" strokeWidth="8" />
                          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
                            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={filled} transform="rotate(-90 70 70)" />
                          <text x="70" y="65" textAnchor="middle" style={{ fontSize: 36, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>{score}</text>
                          <text x="70" y="85" textAnchor="middle" style={{ fontSize: 13, fill: "#9B8778", fontFamily: "'Nunito', sans-serif" }}>/100</text>
                        </>;
                      })()}
                    </svg>
                    <p className="font-black text-lg mt-1" style={{ color: "#3D2B1F" }}>
                      {(app.aiScore ?? 0) >= 75 ? "Highly recommended" : (app.aiScore ?? 0) >= 50 ? "Good fit" : "Low match"}
                    </p>
                    <p className="text-xs mt-0.5 text-center" style={{ color: "#9B8778" }}>
                      Calculated from {applicantName.split(" ")[0]}'s screening answers.
                    </p>
                  </div>
                </div>

                {/* Note */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>
                    Review {applicantName.split(" ")[0]}'s screening answers, then approve or decline below.
                  </p>
                </div>

                {/* Decision */}
                {isPending && (
                  <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <p className="font-black mb-3" style={{ color: "#3D2B1F" }}>Your decision</p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirm("decline")}
                        className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                        style={{ border: "1.5px solid #EF4444", color: "#EF4444", backgroundColor: "white" }}>
                        Decline
                      </button>
                      <button onClick={() => setConfirm("approve")}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition"
                        style={{ backgroundColor: "#F5A623" }}>
                        Approve
                      </button>
                    </div>
                  </div>
                )}

                {!isPending && (
                  <div className="rounded-2xl p-4 text-center"
                    style={{ backgroundColor: app.status === "approved" ? "#DCFCE7" : "#F5F2EE", border: `1px solid ${app.status === "approved" ? "#86EFAC" : "#EEE8E0"}` }}>
                    <p className="font-black" style={{ color: app.status === "approved" ? "#16A34A" : "#9B8778" }}>
                      {app.status === "approved" ? "✓ Application approved" : "Application declined"}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Q&A */}
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-lg" style={{ color: "#3D2B1F" }}>Screening answers</h3>
                    <span className="text-sm" style={{ color: "#9B8778" }}>{questions.length} questions</span>
                  </div>
                  <p className="text-xs mb-6" style={{ color: "#9B8778" }}>
                    How {applicantName.split(" ")[0]} answered the adoption screening for {app.petName}.
                  </p>
                  <div className="space-y-4">
                    {questions.map((qa, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-3 mb-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                            style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>{i + 1}</span>
                          <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{qa.question}</p>
                        </div>
                        <div className="ml-9 flex items-center gap-2 px-4 py-3 rounded-xl"
                          style={{ backgroundColor: "#FFF8F0", border: "1px solid #F5E6CC" }}>
                          <span style={{ color: "#F5A623" }}>✓</span>
                          <p className="text-sm font-semibold" style={{ color: "#6B5E52" }}>{qa.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirm popup */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-3xl p-8 text-center max-w-sm w-full mx-4" style={{ backgroundColor: "white" }}>
            <div className="text-5xl mb-4">{confirm === "approve" ? "✅" : "❌"}</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#3D2B1F" }}>
              {confirm === "approve" ? `Approve ${applicantName.split(" ")[0]}?` : `Decline ${applicantName.split(" ")[0]}?`}
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#9B8778" }}>
              {confirm === "approve"
                ? `This will approve their application for ${app.petName}. They will be notified and can message you.`
                : `This will decline their application for ${app.petName}. This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                Cancel
              </button>
              <button onClick={() => handleDecision(confirm)} disabled={processing}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: confirm === "approve" ? "#F5A623" : "#EF4444", opacity: processing ? 0.7 : 1 }}>
                {processing ? "Saving..." : confirm === "approve" ? "Yes, approve" : "Yes, decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}