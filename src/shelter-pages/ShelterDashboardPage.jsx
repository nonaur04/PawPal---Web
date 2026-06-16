import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ─── Sidebar ────────────────────────────────────────────────────────────────
function ShelterSidebar({ active }) {
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", icon: "🏠", path: "/shelter/dashboard" },
    { label: "Pet Listings", icon: "🐾", path: "/shelter/listings" },
    { label: "Applications", icon: "📋", path: "/shelter/applications" },
    { label: "Stray Reports", icon: "⚠️", path: "/shelter/stray-reports" },
    { label: "Lost Pets", icon: "🔍", path: "/shelter/lost-pets" },
    { label: "Messages", icon: "💬", path: "/shelter/messages" },
  ];

  return (
    <aside
      className="w-56 h-screen sticky top-0 flex flex-col justify-between py-6 px-4 shrink-0"
      style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid #EEE8E0" }}
    >
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2 px-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#F59E0B" }}
          >
            🐾
          </div>
          <div>
            <p className="font-black text-base leading-tight" style={{ color: "#3D2B1F" }}>
              PawPal
            </p>
            <p className="text-xs" style={{ color: "#9B8778" }}>
              Shelter Portal
            </p>
          </div>
        </div>

        <div className="mt-1 mb-4 px-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            Dashboard ▾
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = active === item.label;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-colors"
                style={{
                  backgroundColor: isActive ? "#FEF3C7" : "transparent",
                  color: isActive ? "#92400E" : "#6B5C52",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate("/shelter/profile")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left"
          style={{ color: "#6B5C52" }}
        >
          <span>🏢</span>
          <span>Shelter Profile</span>
        </button>
        <button
          onClick={() => navigate("/shelter/settings")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left"
          style={{ color: "#6B5C52" }}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>

        {/* Shelter badge */}
        <div
          className="mt-3 mx-1 p-3 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: "#FEF3C7" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: "#F59E0B" }}
          >
            🏠
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-bold truncate"
              style={{ color: "#3D2B1F" }}
            >
              Shelter Account
            </p>
            <div className="flex items-center gap-1">
              <span style={{ color: "#22C55E", fontSize: 10 }}>✓</span>
              <p className="text-xs" style={{ color: "#9B8778" }}>
                Verified shelter
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────
function TopBar({ shelterName, userName }) {
  const navigate = useNavigate();
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-8 py-3 bg-white"
      style={{ borderBottom: "1px solid #EEE8E0" }}
    >
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
        <input
          className="pl-9 pr-4 py-2 rounded-xl text-sm w-80 outline-none"
          style={{ backgroundColor: "#F9F5F0", color: "#3D2B1F" }}
          placeholder="Search pets, applicants, reports..."
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F9F5F0" }}>
          🔔
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#F59E0B" }}
          >
            {(userName || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>
              {userName || "Manager"}
            </p>
            <p className="text-xs" style={{ color: "#9B8778" }}>
              Manager
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    Approved: { bg: "#D1FAE5", color: "#065F46", label: "Approved" },
    approved: { bg: "#D1FAE5", color: "#065F46", label: "Approved" },
    Rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
    urgent: { bg: "#FEE2E2", color: "#991B1B", label: "URGENT" },
    "in progress": { bg: "#DBEAFE", color: "#1E40AF", label: "in progress" },
    resolved: { bg: "#D1FAE5", color: "#065F46", label: "resolved" },
    pending_stray: { bg: "#FEF3C7", color: "#92400E", label: "pending" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShelterDashboardPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [shelterName, setShelterName] = useState("Your Shelter");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Stats
  const [animalsListed, setAnimalsListed] = useState(0);
  const [adoptedThisSeason, setAdoptedThisSeason] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [newAppsToday, setNewAppsToday] = useState(0);
  const [openStrayReports, setOpenStrayReports] = useState(0);
  const [resolvedStray, setResolvedStray] = useState(0);

  // Chart data
  const [weeklyBarData, setWeeklyBarData] = useState(null);
  const [speciesData, setSpeciesData] = useState([]);

  // Stray volume
  const [strayUrgent, setStrayUrgent] = useState(0);
  const [strayInProgress, setStrayInProgress] = useState(0);
  const [strayPending, setStrayPending] = useState(0);
  const [strayUnresolved, setStrayUnresolved] = useState(0);
  const [strayPendingUrgent, setStrayPendingUrgent] = useState(0);

  // Applications queue
  const [applications, setApplications] = useState([]);

  // Stray reports nearby
  const [strayReports, setStrayReports] = useState([]);

  // Last updated
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    try {
      // Get current user info
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.fullName || data.name || "Manager");
        setShelterName(data.orgName || data.shelterName || data.fullName || "Your Shelter");
      }

      const uid = user.uid;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // ── Pets ──
      const petsSnap = await getDocs(
        query(collection(db, "pets"), where("ownerId", "==", uid))
      );
      const allPets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnimalsListed(allPets.length);

      const adopted = allPets.filter(
        (p) =>
          p.status === "adopted" &&
          p.createdAt?.toDate?.() >= threeMonthsAgo
      ).length;
      setAdoptedThisSeason(adopted);

      // Pet IDs owned by this shelter
      const petIds = allPets.map((p) => p.id);

      // Species breakdown
      const speciesCount = {};
      allPets.forEach((p) => {
        const s = p.species || "Other";
        speciesCount[s] = (speciesCount[s] || 0) + 1;
      });
      const speciesArr = Object.entries(speciesCount)
        .map(([name, count]) => ({ name, count, pct: Math.round((count / allPets.length) * 100) }))
        .sort((a, b) => b.count - a.count);
      setSpeciesData(speciesArr);

      // ── Applications ──
      let allApps = [];
      if (petIds.length > 0) {
        // Firestore `in` supports up to 30 items
        const chunks = [];
        for (let i = 0; i < petIds.length; i += 30) chunks.push(petIds.slice(i, i + 30));
        for (const chunk of chunks) {
          const appSnap = await getDocs(
            query(collection(db, "applications"), where("petId", "in", chunk))
          );
          allApps = [...allApps, ...appSnap.docs.map((d) => ({ id: d.id, ...d.data() }))];
        }
      }

      const pending = allApps.filter(
        (a) => (a.status || "").toLowerCase() === "pending"
      ).length;
      setPendingApps(pending);

      const todayApps = allApps.filter(
        (a) => a.createdAt?.toDate?.() >= startOfToday
      ).length;
      setNewAppsToday(todayApps);

      // Weekly bar chart: last 7 days, applications vs approved
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const today = now.getDay(); // 0=Sun
      const appsByDay = Array(7).fill(0);
      const approvedByDay = Array(7).fill(0);
      allApps.forEach((a) => {
        if (!a.createdAt?.toDate) return;
        const d = a.createdAt.toDate();
        const diffDays = Math.floor((now - d) / 86400000);
        if (diffDays < 7) {
          // map to Mon=0..Sun=6
          let dayIndex = (d.getDay() + 6) % 7;
          appsByDay[dayIndex]++;
          if ((a.status || "").toLowerCase() === "approved") approvedByDay[dayIndex]++;
        }
      });
      setWeeklyBarData({
        labels: days,
        datasets: [
          {
            label: "Applications",
            data: appsByDay,
            backgroundColor: "#F59E0B",
            borderRadius: 4,
            stack: "stack",
          },
          {
            label: "Approved",
            data: approvedByDay,
            backgroundColor: "#22C55E",
            borderRadius: 4,
            stack: "stack",
          },
        ],
      });

      // Applications queue — 5 most recent
      const sorted = [...allApps].sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });
      const top5 = sorted.slice(0, 5);

      // Enrich with applicant name and pet name
      const enriched = await Promise.all(
        top5.map(async (app) => {
          let applicantName = "Unknown";
          let applicantArea = "";
          let petName = "";
          try {
            const userSnap = await getDoc(doc(db, "users", app.userId || app.applicantId));
            if (userSnap.exists()) {
              applicantName = userSnap.data().name || "Unknown";
              applicantArea = userSnap.data().location || userSnap.data().area || "";
            }
          } catch (_) {}
          try {
            const petSnap = await getDoc(doc(db, "pets", app.petId));
            if (petSnap.exists()) petName = petSnap.data().name || "";
          } catch (_) {}
          return { ...app, applicantName, applicantArea, petName };
        })
      );
      setApplications(enriched);

      // ── Stray Reports ──
      const straySnap = await getDocs(collection(db, "stray_reports"));
      const allStray = straySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const openStray = allStray.filter(
        (r) => r.status !== "resolved"
      ).length;
      setOpenStrayReports(openStray);
      setResolvedStray(allStray.filter((r) => r.status === "resolved").length);

      const urgentCount = allStray.filter((r) => r.isUrgent && r.status !== "resolved").length;
      const inProgressCount = allStray.filter((r) => r.status === "in progress").length;
      const pendingStrayCount = allStray.filter((r) => !r.status || r.status === "pending").length;
      const unresolvedCount = allStray.filter((r) => r.status !== "resolved").length;
      const pendingUrgentCount = allStray.filter(
        (r) => r.isUrgent && (!r.status || r.status === "pending")
      ).length;

      setStrayUrgent(urgentCount);
      setStrayInProgress(inProgressCount);
      setStrayPending(pendingStrayCount);
      setStrayUnresolved(unresolvedCount);
      setStrayPendingUrgent(pendingUrgentCount);

      // Recent stray reports (5 latest)
      const recentStray = [...allStray]
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() || 0;
          const tb = b.createdAt?.toDate?.()?.getTime() || 0;
          return tb - ta;
        })
        .slice(0, 5);
      setStrayReports(recentStray);

      // Last updated
      setLastUpdated(
        new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const speciesColors = ["#F59E0B", "#22C55E", "#3B82F6", "#EC4899", "#8B5CF6"];

  const strayVolumeDoughnut = {
    labels: ["Urgent", "In Progress", "Pending", "Resolved"],
    datasets: [
      {
        data: [strayUrgent, strayInProgress, strayPending, resolvedStray],
        backgroundColor: ["#EF4444", "#3B82F6", "#F59E0B", "#22C55E"],
        borderWidth: 0,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F9F5F0" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F9F5F0" }}>
      <ShelterSidebar active="Dashboard" />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar shelterName={shelterName} userName={userName} />

        <main className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── Hero banner ── */}
          <div
            className="rounded-2xl p-7 mb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #FCD34D 100%)",
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute right-8 top-4 w-32 h-32 rounded-full opacity-20"
              style={{ backgroundColor: "#FFF" }}
            />
            <div
              className="absolute right-20 top-10 w-20 h-20 rounded-full opacity-10"
              style={{ backgroundColor: "#FFF" }}
            />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <h1 className="text-2xl font-black text-white mb-1">
                  {shelterName} 👋
                </h1>
                <p className="text-sm text-white opacity-80">
                  Here's what's happening at your shelter today.
                </p>

                {/* Stat pills */}
                <div className="flex gap-8 mt-5">
                  <div>
                    <p className="text-3xl font-black text-white">{animalsListed}</p>
                    <p className="text-xs font-semibold text-white opacity-80">Animals listed</p>
                    <p className="text-xs text-white opacity-60">{adoptedThisSeason} adopted this season</p>
                  </div>
                  <div className="w-px bg-white opacity-30" />
                  <div>
                    <p className="text-3xl font-black text-white">{pendingApps}</p>
                    <p className="text-xs font-semibold text-white opacity-80">Pending applications</p>
                    <p className="text-xs text-white opacity-60">{newAppsToday} new today</p>
                  </div>
                  <div className="w-px bg-white opacity-30" />
                  <div>
                    <p className="text-3xl font-black text-white">{openStrayReports}</p>
                    <p className="text-xs font-semibold text-white opacity-80">Open stray reports</p>
                    <p className="text-xs text-white opacity-60">{resolvedStray} resolved recently</p>
                  </div>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => navigate("/shelter/post-pet")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white transition-all hover:shadow-md"
                  style={{ color: "#92400E" }}
                >
                  ➕ Post a Pet
                </button>
                <button
                  onClick={() => navigate("/shelter/applications")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white transition-all hover:shadow-md"
                  style={{ color: "#92400E" }}
                >
                  📋 View Applications
                </button>
                <button
                  onClick={() => navigate("/shelter/stray-reports")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white transition-all hover:shadow-md"
                  style={{ color: "#92400E" }}
                >
                  🚨 Stray Reports
                </button>
              </div>
            </div>
          </div>

          {/* ── Analytics overview ── */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black flex items-center gap-2" style={{ color: "#3D2B1F" }}>
              📊 Analytics overview
            </h2>
            <p className="text-xs" style={{ color: "#9B8778" }}>
              Tap any chart to see full history · updated {lastUpdated}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Adoption trends bar */}
            <div className="bg-white rounded-2xl p-5 col-span-1">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>Adoption trends</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Applications vs approved · this week</p>
                </div>
                <div className="flex flex-col gap-1 text-xs" style={{ color: "#9B8778" }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#F59E0B" }} /> Applications</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#22C55E" }} /> Approved</span>
                </div>
              </div>
              {weeklyBarData ? (
                <Bar
                  data={weeklyBarData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false }, tooltip: { mode: "index" } },
                    scales: {
                      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                      y: { stacked: true, display: false },
                    },
                  }}
                  height={130}
                />
              ) : (
                <p className="text-xs text-center py-8" style={{ color: "#9B8778" }}>No data yet</p>
              )}
              <button
                onClick={() => navigate("/shelter/applications")}
                className="text-xs font-semibold mt-2 flex items-center gap-1"
                style={{ color: "#F59E0B" }}
              >
                View full history ›
              </button>
            </div>

            {/* Listings by species */}
            <div className="bg-white rounded-2xl p-5 col-span-1">
              <p className="text-sm font-bold mb-0.5" style={{ color: "#3D2B1F" }}>Listings by species</p>
              <p className="text-xs mb-4" style={{ color: "#9B8778" }}>{animalsListed} animals in care</p>

              {speciesData.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#9B8778" }}>No pets listed yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {speciesData.map((s, i) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>{s.name}</p>
                        <p className="text-xs" style={{ color: "#9B8778" }}>{s.count} · {s.pct}%</p>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#F3F4F6" }}>
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${s.pct}%`, backgroundColor: speciesColors[i % speciesColors.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => navigate("/shelter/listings")}
                className="text-xs font-semibold mt-4 flex items-center gap-1"
                style={{ color: "#F59E0B" }}
              >
                See breeds breakdown ›
              </button>
            </div>

            {/* Stray volume */}
            <div className="bg-white rounded-2xl p-5 col-span-1">
              <p className="text-sm font-bold mb-0.5" style={{ color: "#3D2B1F" }}>Stray volume</p>
              <p className="text-xs mb-4" style={{ color: "#9B8778" }}>Current status</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "#FEF2F2" }}>
                  <p className="text-xl font-black" style={{ color: "#EF4444" }}>🔔 {strayUrgent}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#9B8778" }}>Urgent</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#EFF6FF" }}>
                  <p className="text-xl font-black" style={{ color: "#3B82F6" }}>⏳ {strayInProgress}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#9B8778" }}>In progress</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#F9F5F0" }}>
                  <p className="text-xl font-black" style={{ color: "#6B5C52" }}>🕐 {strayPending}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#9B8778" }}>Pending</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#FFFBEB" }}>
                  <p className="text-xl font-black" style={{ color: "#F59E0B" }}>📁 {strayUnresolved}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#9B8778" }}>Unresolved</p>
                </div>
              </div>

              <p className="text-xs mb-3" style={{ color: "#9B8778" }}>
                Pending:{" "}
                <span className="font-semibold" style={{ color: "#EF4444" }}>
                  {strayPendingUrgent} urgent
                </span>{" "}
                · {strayPending - strayPendingUrgent} routine
              </p>

              <button
                onClick={() => navigate("/shelter/stray-reports")}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: "#F59E0B" }}
              >
                View full history ›
              </button>
            </div>
          </div>

          {/* ── Bottom two columns ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Adoption applications queue */}
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>Adoption applications</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Incoming requests for your pets</p>
                </div>
                <button
                  onClick={() => navigate("/shelter/applications")}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "#F59E0B" }}
                >
                  View all ›
                </button>
              </div>

              {applications.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#9B8778" }}>No applications yet</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      {["APPLICANT", "PET", "SUBMITTED", "STATUS", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs pb-3 font-semibold"
                          style={{ color: "#9B8778" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, i) => (
                      <tr key={app.id} style={{ borderTop: i === 0 ? "none" : "1px solid #F3F4F6" }}>
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: "#F59E0B" }}
                            >
                              {(app.applicantName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>
                                {app.applicantName}
                              </p>
                              {app.applicantArea && (
                                <p className="text-xs" style={{ color: "#9B8778" }}>{app.applicantArea}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <p className="text-xs font-medium" style={{ color: "#3D2B1F" }}>{app.petName || "—"}</p>
                        </td>
                        <td className="py-3 pr-2">
                          <p className="text-xs" style={{ color: "#9B8778" }}>{timeAgo(app.createdAt)}</p>
                        </td>
                        <td className="py-3 pr-2">
                          <StatusBadge status={app.status || "Pending"} />
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => navigate(`/shelter/applications/${app.id}`)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                            style={{ borderColor: "#E5E7EB", color: "#3D2B1F" }}
                          >
                            {(app.status || "pending").toLowerCase() === "pending" ? "Review" : "View"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Stray reports nearby */}
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>Stray reports nearby</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Recent reports needing follow-up</p>
                </div>
                <button
                  onClick={() => navigate("/shelter/stray-reports")}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "#F59E0B" }}
                >
                  Open inbox ›
                </button>
              </div>

              {strayReports.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#9B8778" }}>No stray reports yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {strayReports.map((r) => {
                    const animalEmoji =
                      r.animalType === "Cat" ? "🐱" : r.animalType === "Dog" ? "🐕" : "🐾";
                    const status = r.isUrgent && r.status !== "resolved"
                      ? "urgent"
                      : r.status || "pending_stray";
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/shelter/stray-reports/${r.id}`)}
                        style={{ borderBottom: "1px solid #F9F5F0" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ backgroundColor: "#F9F5F0" }}
                        >
                          {animalEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold" style={{ color: "#3D2B1F" }}>
                              {r.title || "Stray report"}
                            </p>
                            {r.isUrgent && r.status !== "resolved" && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded font-bold"
                                style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                              >
                                URGENT
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>
                            📍 {typeof r.location === "string" ? r.location : "Unknown location"} · {timeAgo(r.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}