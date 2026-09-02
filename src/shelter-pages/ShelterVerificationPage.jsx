import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

function timeStr(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ShelterVerificationPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setShelter(snap.data());
      setLoading(false);
    });
  }, [user]);

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

  const status = shelter?.verificationStatus || "pending";
  const orgName = shelter?.orgName || "Your Shelter";
  const submittedAt = shelter?.submittedAt;
  const docs = shelter?.documents || {};

  // Progress steps
  const steps = [
    {
      label: "Application submitted",
      sub: submittedAt ? timeStr(submittedAt) : "Submitted",
      done: true,
    },
    {
      label: "Application being reviewed",
      sub: status === "approved" || status === "rejected" ? "Completed" : "In progress",
      done: status === "approved" || status === "rejected",
      active: status === "pending",
    },
    {
      label: "Verification result",
      sub: status === "approved" ? "Approved ✓" : status === "rejected" ? "Not approved" : "Pending",
      done: status === "approved" || status === "rejected",
      active: false,
    },
  ];

  const statusConfig = {
    pending: {
      bg: "#FFF8EC", border: "#FDDFA0", badge: "#F5A623", badgeText: "UNDER REVIEW",
      icon: "🔍", title: "Your shelter is being verified",
      desc: "An admin is checking your documents. You'll be notified as soon as there's a decision.",
      titleColor: "#F5A623",
    },
    approved: {
      bg: "#F0FDF4", border: "#86EFAC", badge: "#16A34A", badgeText: "APPROVED",
      icon: "✅", title: "Your shelter is approved!",
      desc: "You now have full access to all PawPal features. Welcome aboard!",
      titleColor: "#16A34A",
    },
    rejected: {
      bg: "#FEF2F2", border: "#FECACA", badge: "#EF4444", badgeText: "NOT APPROVED",
      icon: "❌", title: "Verification was not approved",
      desc: "Your application did not meet the requirements. Please contact PawPal for more details.",
      titleColor: "#EF4444",
    },
  };

  const cfg = statusConfig[status] || statusConfig.pending;

  // Document list
  const docList = [
    { key: "ssmCert", label: "SSM registration certificate" },
    { key: "premisePhotos", label: "Premise photos" },
    { key: "dvsLicence", label: "DVS animal facility licence" },
    { key: "vetLetter", label: "Vet partnership letter" },
    { key: "otherDocs", label: "Other supporting documents", optional: true },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar orgName={orgName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Verification status</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Your shelter goes public once a PawPal admin approves it.</p>

          {/* Status banner */}
          <div className="rounded-2xl p-5 mb-5 flex items-center gap-4"
            style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
            <span style={{ fontSize: 36 }}>{cfg.icon}</span>
            <div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full inline-block mb-1"
                style={{ backgroundColor: cfg.badge, color: "white" }}>
                {cfg.badgeText}
              </span>
              <p className="font-black text-lg" style={{ color: cfg.titleColor }}>{cfg.title}</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>{cfg.desc}</p>
            </div>
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-5">

            {/* Progress */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <h3 className="font-black mb-5" style={{ color: "#3D2B1F" }}>Progress</h3>
              <div className="flex flex-col gap-0">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex items-start gap-3">
                    {/* Icon + line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                        style={{
                          backgroundColor: step.done ? "#F5A623" : step.active ? "#FFF3E0" : "#F5F2EE",
                          border: step.active ? "2px solid #F5A623" : "none",
                          color: step.done ? "white" : step.active ? "#F5A623" : "#9B8778",
                        }}>
                        {step.done ? "✓" : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div style={{ width: 2, height: 36, backgroundColor: step.done ? "#F5A623" : "#EEE8E0", margin: "4px 0" }} />
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-6">
                      <p className="font-black text-sm" style={{ color: step.done || step.active ? "#3D2B1F" : "#9B8778" }}>
                        {step.label}
                      </p>
                      <p className="text-xs" style={{ color: step.done ? "#F5A623" : "#9B8778" }}>{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents submitted */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <h3 className="font-black mb-4" style={{ color: "#3D2B1F" }}>Documents submitted</h3>
              <div className="flex flex-col gap-2">
                {docList.map((d) => {
                  const url = docs[d.key];
                  if (!url && d.optional) return null;
                  const hasDoc = !!url;
                  // url can be string (single) or array (multiple)
                  const urls = Array.isArray(url) ? url : url ? [url] : [];
                  return (
                    <div key={d.key} className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ backgroundColor: "#F5F2EE" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: hasDoc ? "#16A34A" : "#9B8778", fontSize: 14 }}>{hasDoc ? "✓" : "–"}</span>
                        <p className="text-sm font-semibold" style={{ color: hasDoc ? "#3D2B1F" : "#9B8778" }}>{d.label}</p>
                        {urls.length > 1 && <span className="text-xs" style={{ color: "#9B8778" }}>({urls.length} files)</span>}
                      </div>
                      {hasDoc && (
                        <div className="flex gap-2">
                          {urls.map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-bold"
                              style={{ color: "#F5A623" }}>
                              {urls.length > 1 ? `View ${i + 1}` : "View"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs mt-4" style={{ color: "#9B8778" }}>
                Submitted {submittedAt ? timeStr(submittedAt) : "—"}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}