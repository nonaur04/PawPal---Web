import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = {
  dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0",
  bird: "#C4E0F2", others: "#D4F2C4",
};
const SPECIES_EMOJI = {
  dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾",
};

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

function ScoreRing({ score }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const filled = circumference - (circumference * score) / 100;
  const color = score >= 75 ? "#16A34A" : score >= 50 ? "#F5A623" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-xs font-semibold" style={{ color: "#9B8778" }}>AI Score</p>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#EEE8E0" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle"
          style={{ fontSize: 13, fontWeight: 900, fill: color, fontFamily: "'Nunito', sans-serif" }}>
          {score}
        </text>
      </svg>
    </div>
  );
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

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/"); return; }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name || data.fullName || data.displayName || "");
        }

        // Fetch applications for this user
        const appSnap = await getDocs(
          query(collection(db, "applications"), where("applicantId", "==", user.uid))
        );

        const apps = await Promise.all(
          appSnap.docs.map(async (appDoc) => {
            const appData = { id: appDoc.id, ...appDoc.data() };

            // Fetch pet info
            let pet = null;
            try {
              const petDoc = await getDoc(doc(db, "pets", appData.petId));
              if (petDoc.exists()) pet = { id: petDoc.id, ...petDoc.data() };
            } catch {}

            // Fetch shelter/owner info
            let shelter = null;
            try {
              if (pet?.ownerId) {
                const ownerDoc = await getDoc(doc(db, "users", pet.ownerId));
                if (ownerDoc.exists()) shelter = ownerDoc.data();
              }
            } catch {}

            return { ...appData, pet, shelter };
          })
        );

        // Sort by newest first
        apps.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(0);
          const bTime = b.createdAt?.toDate?.() ?? new Date(0);
          return bTime - aTime;
        });

        setApplications(apps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} activePage="applications" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>My Applications</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Track your adoption applications and AI scores</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: "white" }} />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-4">📋</p>
              <p className="font-black text-lg mb-1" style={{ color: "#3D2B1F" }}>No applications yet</p>
              <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Browse pets and apply to adopt one!</p>
              <button
                onClick={() => navigate("/home")}
                className="px-6 py-3 rounded-xl text-white text-sm font-bold"
                style={{ backgroundColor: "#F5A623" }}
              >
                Discover pets
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {applications.map((app) => {
                const pet = app.pet;
                const shelter = app.shelter;
                const bg = SPECIES_BG[pet?.species?.toLowerCase()] ?? "#F9BFBF";
                const emoji = SPECIES_EMOJI[pet?.species?.toLowerCase()] ?? "🐾";
                const photoUrl = pet?.photoUrls?.[0] ?? null;
                const shelterName = shelter?.name || shelter?.shelterName || shelter?.displayName || "Owner";

                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                  >
                    {/* Pet photo */}
                    <div
                      className="rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                      style={{
                        width: 60, height: 60,
                        backgroundColor: bg,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.18) 5px, rgba(255,255,255,0.18) 10px)",
                      }}
                    >
                      {photoUrl
                        ? <img src={photoUrl} alt={pet?.name} className="w-full h-full object-cover" />
                        : <span style={{ fontSize: 28 }}>{emoji}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{pet?.name ?? app.petName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>
                        {shelterName} · Submitted {timeAgo(app.createdAt)}
                      </p>
                    </div>

                    {/* Score ring */}
                    <ScoreRing score={app.aiScore ?? 0} />

                    {/* Status */}
                    <StatusBadge status={app.status} />

                    {/* View button */}
                    <button
                      onClick={() => navigate(`/application/${app.id}`)}
                      className="text-sm font-bold px-4 py-2 rounded-xl shrink-0 transition"
                      style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                    >
                      View
                    </button>
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