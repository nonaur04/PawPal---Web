import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
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

function ScoreRing({ score, size = 56 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const filled = circ - (circ * score) / 100;
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#F5A623" : "#EF4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EEE8E0" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={filled}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        style={{ fontSize: size * 0.28, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
        {score}
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: "#FFF3E0", color: "#F5A623", label: "Pending review" },
    approved: { bg: "#DCFCE7", color: "#16A34A", label: "Approved ✓" },
    rejected: { bg: "#F5F2EE", color: "#9B8778", label: "Declined" },
  };
  const s = map[status] ?? map.pending;
  return <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sent");
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [sentApps, setSentApps] = useState([]);
  const [receivedApps, setReceivedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [petMap, setPetMap] = useState({});
  const [userMap, setUserMap] = useState({});
  const pendingCount = receivedApps.filter((a) => a.status === "pending").length;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUser(u); setUserName(u.displayName || "");
      try {
        const appsSnap = await getDocs(collection(db, "applications"));
        const all = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sent = all.filter((a) => a.applicantId === u.uid)
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        const received = all.filter((a) => a.ownerId === u.uid)
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));
        setSentApps(sent);
        setReceivedApps(received);

        // Fetch pets
        const petIds = [...new Set([...sent, ...received].map((a) => a.petId).filter(Boolean))];
        const userIds = [...new Set([...sent.map((a) => a.ownerId), ...received.map((a) => a.applicantId)].filter(Boolean))];
        const petsSnap = await getDocs(collection(db, "pets"));
        const pm = {};
        petsSnap.docs.forEach((d) => { if (petIds.includes(d.id)) pm[d.id] = d.data(); });
        setPetMap(pm);
        const usersSnap = await getDocs(collection(db, "users"));
        const um = {};
        usersSnap.docs.forEach((d) => { if (userIds.includes(d.id)) um[d.id] = d.data(); });
        setUserMap(um);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const tabs = [
    { key: "sent", label: "Applications I sent", count: sentApps.length },
    { key: "received", label: "Applicants for my pets", count: receivedApps.length, dot: pendingCount > 0 },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Applications</h1>
            <p className="text-sm mb-5" style={{ color: "#9B8778" }}>
              {activeTab === "sent" ? "Track the adoption applications you submitted and their AI scores" : "Review and approve people who applied to adopt the pets you listed"}
            </p>

            {/* Tabs */}
            <div className="mb-6" style={{ display: "inline-flex", padding: 4, borderRadius: 16, backgroundColor: "#EEEBE6" }}>
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition"
                  style={{ borderRadius: 12, backgroundColor: activeTab === tab.key ? "white" : "transparent", color: activeTab === tab.key ? "#F5A623" : "#9B8778", boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                  {tab.label}
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: activeTab === tab.key ? "#FFF3E0" : "rgba(0,0,0,0.06)", color: activeTab === tab.key ? "#F5A623" : "#9B8778" }}>
                    {tab.count}
                  </span>
                  {tab.dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F5A623" }} />}
                </button>
              ))}
            </div>

            {/* Sent applications */}
            {activeTab === "sent" && (
              <div className="max-w-3xl">
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
                ) : sentApps.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <p className="text-3xl mb-3">🐾</p>
                    <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No applications yet</p>
                    <p className="text-sm mb-4" style={{ color: "#9B8778" }}>Browse pets and apply to adopt one!</p>
                    <button onClick={() => navigate("/home")} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#F5A623" }}>Discover pets</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentApps.map((app) => {
                      const pet = petMap[app.petId];
                      const owner = userMap[app.ownerId];
                      const ownerName = owner?.name || owner?.displayName || owner?.shelterName || "Owner";
                      const bg = SPECIES_BG[pet?.species?.toLowerCase()] ?? "#F9BFBF";
                      const emoji = SPECIES_EMOJI[pet?.species?.toLowerCase()] ?? "🐾";
                      return (
                        <div key={app.id} className="flex items-center gap-4 p-4 rounded-2xl"
                          style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                          <div className="rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                            style={{ width: 60, height: 60, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)" }}>
                            {pet?.photoUrls?.[0] ? <img src={pet.photoUrls[0]} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 28 }}>{emoji}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{app.petName}</p>
                            <p className="text-xs" style={{ color: "#9B8778" }}>{ownerName} · Submitted {timeAgo(app.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right mr-1">
                              <p className="text-xs" style={{ color: "#9B8778" }}>AI Score</p>
                              <ScoreRing score={app.aiScore ?? 0} size={52} />
                            </div>
                            <StatusBadge status={app.status} />
                            <button onClick={() => navigate(`/application/${app.id}`)}
                              className="px-4 py-2 rounded-xl text-sm font-bold"
                              style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Received applications */}
            {activeTab === "received" && (
              <div className="max-w-4xl">
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
                ) : receivedApps.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <p className="text-3xl mb-3">🐾</p>
                    <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No applicants yet</p>
                    <p className="text-sm" style={{ color: "#9B8778" }}>When someone applies for your pets, they'll appear here.</p>
                  </div>
                ) : (
                  <>
                    {pendingCount > 0 && (
                      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl mb-4"
                        style={{ backgroundColor: "#FFF3E0", border: "1px solid #F5E6CC" }}>
                        <span>🐾</span>
                        <p className="text-sm font-semibold" style={{ color: "#6B5E52" }}>
                          {pendingCount} applicant{pendingCount > 1 ? "s" : ""} waiting for your decision
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {receivedApps.map((app) => (
                        <ReceivedAppRow key={app.id} app={app} petMap={petMap} userMap={userMap} onReview={() => navigate(`/review-applicant/${app.id}`)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ReceivedAppRow({ app, petMap, userMap, onReview }) {
  const navigate = useNavigate();
  const pet = petMap[app.petId];
  const applicant = userMap[app.applicantId];
  const applicantName = applicant?.name || applicant?.displayName || "Applicant";
  const bg = SPECIES_BG[pet?.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[pet?.species?.toLowerCase()] ?? "🐾";

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: "#FFF3E0" }}>
        👤
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{applicantName}</p>
        <p className="text-xs" style={{ color: "#9B8778" }}>
          Applied for <span className="font-bold" style={{ color: "#3D2B1F" }}>{app.petName}</span> · {timeAgo(app.createdAt)}
        </p>
      </div>
      {/* Score + actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs mb-0.5" style={{ color: "#9B8778" }}>AI Score</p>
          <ScoreRing score={app.aiScore ?? 0} size={52} />
        </div>
        {app.status === "pending" ? (
          <>
            <button onClick={onReview}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
              Review
            </button>
            <button onClick={onReview}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ border: "1.5px solid #EF4444", color: "#EF4444", backgroundColor: "white" }}>
              Decline
            </button>
            <button onClick={onReview}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#F5A623" }}>
              Approve
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: app.status === "approved" ? "#DCFCE7" : "#F5F2EE", color: app.status === "approved" ? "#16A34A" : "#9B8778" }}>
              {app.status === "approved" ? "Approved" : "Declined"}
            </span>
            <button onClick={onReview}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
              View
            </button>
          </>
        )}
      </div>
    </div>
  );
}