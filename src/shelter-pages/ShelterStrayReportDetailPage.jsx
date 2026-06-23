import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const ANIMAL_EMOJI = { cat: "🐱", dog: "🐕", rabbit: "🐇", bird: "🐦", other: "🐾" };
const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: "#FEF3C7", color: "#92400E", label: "pending" },
    "in progress": { bg: "#FEF3C7", color: "#92400E", label: "in progress" },
    resolved: { bg: "#DCFCE7", color: "#16A34A", label: "resolved" },
  };
  const s = map[(status || "pending").toLowerCase()] || map.pending;
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

const STATUS_OPTIONS = [
  { key: "pending", label: "Pending", icon: "🕐" },
  { key: "in progress", label: "In progress", icon: "⏳" },
  { key: "resolved", label: "Resolved", icon: "✅" },
];

export default function ShelterStrayReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [report, setReport] = useState(null);
  const [reporter, setReporter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const reportDoc = await getDoc(doc(db, "stray_reports", id));
        if (!reportDoc.exists()) return;
        const data = { id: reportDoc.id, ...reportDoc.data() };
        setReport(data);

        if (data.reporterId) {
          const userDoc = await getDoc(doc(db, "users", data.reporterId));
          if (userDoc.exists()) setReporter(userDoc.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleStatusChange(newStatus) {
    if (newStatus === (report.status || "pending")) return;
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === "in progress" && !report.assignedTo) {
        updates.assignedTo = user.uid;
      }
      await updateDoc(doc(db, "stray_reports", id), updates);
      setReport((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
      setConfirmStatus(null);
    }
  }

  function requestStatusChange(newStatus) {
    if (newStatus === (report.status || "pending")) return;
    setConfirmStatus(newStatus);
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

  if (!report) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <p style={{ color: "#9B8778" }}>Report not found.</p>
      </div>
    );
  }

  const emoji = ANIMAL_EMOJI[(report.animalType || "").toLowerCase()] || "🐾";
  const reporterName = reporter?.fullName || reporter?.name || "Anonymous";
  const locationText = typeof report.location === "string" ? report.location : "Unknown location";
  const status = report.status || "pending";
  const lat = report.geoPoint?.latitude;
  const lng = report.geoPoint?.longitude;
  const shortId = `#S${id.slice(0, 1).toUpperCase()}${id.slice(-2)}`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Back */}
          <button
            onClick={() => navigate("/shelter/stray-reports")}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to inbox
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{report.title || "Stray report"}</h1>
              {report.isUrgent && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                  🔔 URGENT
                </span>
              )}
              <StatusPill status={status} />
            </div>
            <p className="text-sm" style={{ color: "#9B8778" }}>
              Reported by {reporterName} · {timeAgo(report.createdAt)} · {shortId}
            </p>
          </div>

          {/* Content */}
          <div className="flex gap-5">
            {/* Left */}
            <div className="flex-1 flex flex-col gap-5">

              {/* Photo */}
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ height: 380, backgroundColor: "#F9C4B0", backgroundImage: report.photoUrl ? "none" : STRIPE_BG }}
              >
                {report.photoUrl
                  ? <img src={report.photoUrl} alt={report.title} className="w-full h-full object-cover" />
                  : <span style={{ fontSize: 100 }}>{emoji}</span>
                }
              </div>

              {/* Description */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>Description</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{report.description}</p>
              </div>

              {/* Location */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Location</h3>
                <p className="text-sm mb-3" style={{ color: "#6B5E52" }}>📍 {locationText}</p>
                <div className="rounded-xl overflow-hidden" style={{ height: 220, backgroundColor: "#E5E7DB" }}>
                  {lat && lng ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full cursor-pointer"
                    >
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=800x400&markers=color:orange%7C${lat},${lng}&key=AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8`}
                        alt="Report location"
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-sm" style={{ color: "#9B8778" }}>No coordinates available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-5" style={{ width: 320 }}>

              {/* Update status */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Update status</h3>
                <div className="flex flex-col gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = status.toLowerCase() === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => requestStatusChange(opt.key)}
                        disabled={updating}
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition"
                        style={{
                          backgroundColor: isActive ? "#FDF1DC" : "white",
                          border: isActive ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                          color: "#3D2B1F",
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{opt.icon}</span> {opt.label}
                        </span>
                        {isActive && <span style={{ color: "#F5A623" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reporter */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Reporter</h3>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: "#F59E0B" }}
                  >
                    {reporterName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>{reporterName}</p>
                    <p className="text-xs" style={{ color: "#9B8778" }}>Reported {timeAgo(report.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/shelter/messages?with=${report.reporterId}`)}
                    className="px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition"
                    style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                  >
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirm status change modal */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-8 w-96 text-center" style={{ backgroundColor: "white" }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ backgroundColor: "#FDF1DC" }}
            >
              {confirmStatus === "resolved" ? "✅" : confirmStatus === "in progress" ? "⏳" : "🕐"}
            </div>
            <p className="font-black text-lg mb-2" style={{ color: "#3D2B1F" }}>
              Change status to {confirmStatus}?
            </p>
            <p className="text-sm mb-6" style={{ color: "#9B8778" }}>
              The reporter will be notified that this report is now {confirmStatus}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStatus(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(confirmStatus)}
                disabled={updating}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: "#F5A623" }}
              >
                {updating ? "..." : "Yes, update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}