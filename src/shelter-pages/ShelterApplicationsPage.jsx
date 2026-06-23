import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const TABS = ["Pending", "Approved", "Declined", "All"];

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ScoreRing({ score, size = 52 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const filled = circ - (circ * score) / 100;
  const color = score >= 80 ? "#16A34A" : score >= 60 ? "#F5A623" : "#EF4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEE8E0" strokeWidth="4.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4.5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={filled}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        style={{ fontSize: size * 0.28, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
        {score}
      </text>
    </svg>
  );
}

function RecommendationBadge({ recommendation, score }) {
  const rec = (recommendation || "").toLowerCase();
  if (rec.includes("approve") || score >= 70) {
    return (
      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
        {recommendation || "Recommended"}
      </span>
    );
  }
  if (rec.includes("review") || (score >= 50 && score < 70)) {
    return (
      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
        {recommendation || "Review carefully"}
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
      {recommendation || "Not recommended"}
    </span>
  );
}

export default function ShelterApplicationsPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [applications, setApplications] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [petMap, setPetMap] = useState({});
  const [activeTab, setActiveTab] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { appId, action }

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    try {
      // Get shelter's pet IDs
      const petsSnap = await getDocs(
        query(collection(db, "pets"), where("ownerId", "==", user.uid))
      );
      const pets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const petIds = pets.map((p) => p.id);
      const pm = {};
      pets.forEach((p) => { pm[p.id] = p; });
      setPetMap(pm);

      if (petIds.length === 0) { setLoading(false); return; }

      // Get all applications for those pets
      let allApps = [];
      const chunks = [];
      for (let i = 0; i < petIds.length; i += 30) chunks.push(petIds.slice(i, i + 30));
      for (const chunk of chunks) {
        const appSnap = await getDocs(
          query(collection(db, "applications"), where("petId", "in", chunk))
        );
        allApps = [...allApps, ...appSnap.docs.map((d) => ({ id: d.id, ...d.data() }))];
      }
      allApps.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });
      setApplications(allApps);

      // Fetch applicant user docs
      const userIds = [...new Set(allApps.map((a) => a.applicantId || a.userId).filter(Boolean))];
      const um = {};
      await Promise.all(userIds.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) {
            um[uid] = snap.data();
          } else {
            console.warn(`No users/${uid} document found for an application's applicantId/userId.`);
          }
        } catch (_) {}
      }));
      setUserMap(um);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(appId, action) {
    setActionLoading(appId + action);
    try {
      const status = action === "approve" ? "approved" : "rejected";
      await updateDoc(doc(db, "applications", appId), { status });
      setApplications((prev) =>
        prev.map((a) => a.id === appId ? { ...a, status } : a)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  }

  const filtered = activeTab === "All"
    ? applications
    : applications.filter((a) => {
        const s = (a.status || "pending").toLowerCase();
        if (activeTab === "Pending") return s === "pending";
        if (activeTab === "Approved") return s === "approved";
        if (activeTab === "Declined") return s === "rejected";
        return true;
      });

  const tabCounts = {
    Pending: applications.filter((a) => (a.status || "pending").toLowerCase() === "pending").length,
    Approved: applications.filter((a) => (a.status || "").toLowerCase() === "approved").length,
    Declined: applications.filter((a) => (a.status || "").toLowerCase() === "rejected").length,
    All: applications.length,
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading applications...</p>
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

          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Applications</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>AI-scored adopters for your pets</p>

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

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="text-3xl mb-3">📋</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No applications here</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>
                {activeTab === "All" ? "Applications will appear once adopters apply for your pets." : `No ${activeTab.toLowerCase()} applications.`}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              {/* Header */}
              <div
                className="grid text-xs font-bold px-6 py-3"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr 180px",
                  color: "#9B8778",
                  borderBottom: "1px solid #EEE8E0",
                }}
              >
                <span>APPLICANT</span>
                <span>PET</span>
                <span>AI SCORE</span>
                <span>RECOMMENDATION</span>
                <span>SUBMITTED</span>
                <span />
              </div>

              {/* Rows */}
              {filtered.map((app, i) => {
                const uid = app.applicantId || app.userId;
                const userData = userMap[uid] || {};
                const applicantName = userData.fullName || userData.name || "Applicant";
                const pet = petMap[app.petId];
                const petName = app.petName || pet?.name || "—";
                const score = app.aiScore ?? 0;
                const isPending = (app.status || "pending").toLowerCase() === "pending";

                return (
                  <div
                    key={app.id}
                    className="grid items-center px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr 180px",
                      borderTop: i === 0 ? "none" : "1px solid #F3F4F6",
                    }}
                    onClick={() => navigate(`/shelter/applications/${app.id}`)}
                  >
                    {/* Applicant */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: "#F59E0B" }}
                      >
                        {applicantName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>
                          {applicantName}
                        </p>
                      </div>
                    </div>

                    {/* Pet */}
                    <span className="text-sm font-medium" style={{ color: "#3D2B1F" }}>{petName}</span>

                    {/* AI Score */}
                    <div>
                      <ScoreRing score={score} size={52} />
                    </div>

                    {/* Recommendation */}
                    <div>
                      <RecommendationBadge recommendation={app.aiRecommendation} score={score} />
                    </div>

                    {/* Submitted */}
                    <span className="text-sm" style={{ color: "#9B8778" }}>{timeAgo(app.createdAt)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      {isPending ? (
                        <>
                          <button
                            onClick={() => setConfirmModal({ appId: app.id, action: "decline" })}
                            disabled={!!actionLoading}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition hover:bg-gray-50"
                            style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => setConfirmModal({ appId: app.id, action: "approve" })}
                            disabled={!!actionLoading}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition"
                            style={{ backgroundColor: "#F5A623" }}
                          >
                            Approve
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className="text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{
                              backgroundColor: app.status === "approved" ? "#DCFCE7" : "#F3F4F6",
                              color: app.status === "approved" ? "#16A34A" : "#6B7280",
                            }}
                          >
                            {app.status === "approved" ? "Approved" : "Declined"}
                          </span>
                          <button
                            onClick={() => navigate(`/shelter/applications/${app.id}`)}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition hover:bg-gray-50"
                            style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                          >
                            View
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-6 w-80" style={{ backgroundColor: "white" }}>
            <p className="font-black text-base mb-2" style={{ color: "#3D2B1F" }}>
              {confirmModal.action === "approve" ? "Approve this applicant?" : "Decline this applicant?"}
            </p>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>
              {confirmModal.action === "approve"
                ? "The applicant will be notified and the listing will be updated."
                : "The applicant will be notified that their application was declined."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmModal.appId, confirmModal.action)}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: confirmModal.action === "approve" ? "#F5A623" : "#EF4444" }}
              >
                {actionLoading ? "..." : confirmModal.action === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}