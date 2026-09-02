// src/admin-pages/AdminShelterVerificationPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import AdminSidebar from "../components/AdminSidebar";

const ADMIN_NAME = "Liyana Afiera";
const SLA_DAYS = 2;

/* ---------- helpers ---------- */
function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function agoLabel(date) {
  if (!date) return "—";
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) {
    const h = Math.floor(ms / 3600000);
    return h <= 1 ? "today" : `${h} hours ago`;
  }
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return w === 1 ? "1 week ago" : `${w} weeks ago`;
  const mo = Math.floor(days / 30);
  return mo === 1 ? "1 month ago" : `${mo} months ago`;
}
function daysWaiting(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/* ---------- status pill ---------- */
function StatusPill({ status }) {
  const map = {
    pending: { dot: "#F5A623", bg: "#FBF6ED", bd: "#EFE4D2", tx: "#8A6A3A", label: "Pending review" },
    review: { dot: "#F5A623", bg: "#FBF6ED", bd: "#EFE4D2", tx: "#8A6A3A", label: "In review" },
    approved: { dot: "#2E9E5B", bg: "#E9F5EE", bd: "#CFE9D9", tx: "#1F7A45", label: "Approved" },
    rejected: { dot: "#D9534F", bg: "#FCECEB", bd: "#F1D3D1", tx: "#B23B36", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold"
      style={{ backgroundColor: s.bg, borderColor: s.bd, color: s.tx }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

/* ---------- tabs ---------- */
function Tab({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
        active ? "bg-[#F5A623] text-white" : "text-[#8A7B67] hover:bg-[#F2ECE2]"
      }`}
    >
      {label}
      <span
        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
          active ? "bg-white/25 text-white" : "bg-[#E9E1D4] text-[#7A6E5C]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ---------- page ---------- */
export default function AdminShelterVerificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shelters, setShelters] = useState([]);
  const [tab, setTab] = useState("needs");

  useEffect(() => {
    (async () => {
      try {
        // pets grouped by owner (for "pets waiting")
        const petsSnap = await getDocs(collection(db, "pets"));
        const petCount = {};
        petsSnap.docs.forEach((p) => {
          const oid = p.data().ownerId;
          if (oid) petCount[oid] = (petCount[oid] || 0) + 1;
        });

        const usersSnap = await getDocs(collection(db, "users"));
        const list = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "shelter")
          .map((u) => {
            const created = toDate(u.createdAt);
            const status = u.verificationStatus || "approved"; // missing = grandfathered
            const inQueue = status === "pending" || status === "review";
            return {
              id: u.id,
              name: u.orgName || u.fullName || u.name || "Unnamed shelter",
              place: u.location || u.city || u.state || "Malaysia",
              created,
              submitted: agoLabel(created),
              status,
              petsWaiting: petCount[u.id] || 0,
              high: inQueue && daysWaiting(created) >= SLA_DAYS,
            };
          });
        setShelters(list);
      } catch (e) {
        console.error("Shelter verification load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const needs = shelters
    .filter((s) => s.status === "pending" || s.status === "review")
    .sort((a, b) => (a.created?.getTime() || 0) - (b.created?.getTime() || 0));
  const decided = shelters
    .filter((s) => s.status === "approved" || s.status === "rejected")
    .sort((a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
  const all = [...shelters].sort(
    (a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0)
  );

  const rows = tab === "needs" ? needs : tab === "decided" ? decided : all;
  const pastSla = needs.filter((s) => daysWaiting(s.created) >= SLA_DAYS).length;

  return (
    <div className="flex min-h-screen bg-[#F5F0E8] text-[#2A2118]">
      <AdminSidebar adminName={ADMIN_NAME} pendingCount={needs.length} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* top bar */}
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FCEBD0] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C2650B]">
            <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
            Internal Tooling
          </span>
          <div className="flex items-center gap-4">
            {pastSla > 0 && (
              <span className="flex items-center gap-2 text-sm font-bold text-[#C0442F]">
                ⏰ {pastSla} review{pastSla > 1 ? "s" : ""} past SLA
              </span>
            )}
            <div className="flex items-center gap-2.5 rounded-full border border-[#EFE9DF] bg-white py-1 pl-1 pr-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A623] text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5l8-3z" />
                </svg>
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold">{ADMIN_NAME}</div>
                <div className="text-xs text-[#9A8B76]">Platform Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* title */}
        <h1 className="text-3xl font-extrabold">Shelter verification</h1>
        <p className="mt-1 text-sm font-medium text-[#9A8B76]">
          A shelter cannot publish pet listings until it is approved here.
        </p>

        {/* tabs */}
        <div className="mt-5 inline-flex gap-1 rounded-2xl border border-[#EFE9DF] bg-white p-1">
          <Tab active={tab === "needs"} label="Needs action" count={needs.length} onClick={() => setTab("needs")} />
          <Tab active={tab === "decided"} label="Decided" count={decided.length} onClick={() => setTab("decided")} />
          <Tab active={tab === "all"} label="All" count={all.length} onClick={() => setTab("all")} />
        </div>

        {/* table */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-[#EFE9DF] bg-white">
          {/* header */}
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr] items-center gap-3 border-b border-[#F1EBE0] bg-[#FBF7F0] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#A08A6C]">
            <div>Shelter</div>
            <div>Submitted</div>
            <div>Pets waiting</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-[#9A8B76]">
              Loading shelters…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-[#9A8B76]">
              Nothing here.
            </div>
          ) : (
            rows.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/admin/verification/${s.id}`)}
                className="grid w-full grid-cols-[2.2fr_1fr_1fr_1.2fr] items-center gap-3 border-b border-[#F5F0E8] px-5 py-4 text-left last:border-0 hover:bg-[#FBF7F0]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEBCF] text-base font-bold text-[#B45309]">
                    {s.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-[#2A2118]">{s.name}</span>
                      {s.high && (
                        <span className="rounded-md bg-[#FCE1DC] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#C0442F]">
                          High
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-[#9A8B76]">{s.place}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-[#8A7B67]">{s.submitted}</div>
                <div className="text-sm font-bold text-[#2A2118]">
                  {s.petsWaiting || "—"}
                </div>
                <div>
                  <StatusPill status={s.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </main>
    </div>
  );
}