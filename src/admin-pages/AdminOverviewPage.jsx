// src/admin-pages/AdminOverviewPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import AdminSidebar from "../components/AdminSidebar";

/* ----------------------------------------------------------------
   ADJUST THESE IF YOUR FIELD NAMES DIFFER
   - APPROVED_STATUSES: which `status` values on an application count
     as a completed adoption.
   - Shelter verification lives on the user doc as `verificationStatus`:
       "pending"  -> waiting in queue (shown as "Pending review")
       "review"   -> admin looking at it (shown as "In review")
       "approved" -> verified, counts as an active shelter
       "rejected" -> denied, out of the queue
     A shelter with NO verificationStatus is treated as approved/active.
------------------------------------------------------------------- */
const APPROVED_STATUSES = ["approved", "accepted", "adopted", "completed"];
const SLA_HOURS = 48;
const ADMIN_NAME = "Liyana Afiera";

/* ---------- helpers ---------- */
function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function agoLabel(date) {
  if (!date) return "";
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
function sameMonth(date, ref) {
  return (
    date &&
    date.getMonth() === ref.getMonth() &&
    date.getFullYear() === ref.getFullYear()
  );
}

/* ---------- small pieces ---------- */
function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#EFE4D2] bg-[#FBF6ED] px-3 py-1 text-xs font-bold text-[#8A6A3A]">
      <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
      {status}
    </span>
  );
}
function KpiCard({ label, value, sub, highlight }) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        highlight ? "border-[#F3D39A] bg-[#FCEBD0]" : "border-[#EFE9DF] bg-white"
      }`}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#A08A6C]">
        {label}
      </div>
      <div
        className={`mt-1 text-4xl font-extrabold ${
          highlight ? "text-[#D98016]" : "text-[#2A2118]"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-[#9A8B76]">{sub}</div>
    </div>
  );
}
function QueueRow({ item, onReview }) {
  return (
    <button
      onClick={() => onReview(item)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-[#FBF7F0]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEBCF] text-base font-bold text-[#B45309]">
        {item.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-[#2A2118]">{item.name}</div>
        <div className="truncate text-sm text-[#9A8B76]">
          {item.place} · {item.ago}
        </div>
      </div>
      <StatusBadge status={item.status} />
    </button>
  );
}
function InboundChart({ data, highlightFrom }) {
  return (
    <div className="mt-4">
      <div className="flex h-28 items-end gap-1">
        {data.map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${
              i >= highlightFrom ? "bg-[#F5A623]" : "bg-[#E9DEC9]"
            }`}
            style={{ height: `${Math.max(6, v * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-[#A08A6C]">
        <span>30 days ago</span>
        <span className="text-[#C2650B]">This week</span>
      </div>
    </div>
  );
}
function ActivityDot({ type }) {
  const map = {
    approve: { bg: "#E6F4EA", fg: "#2E9E5B", glyph: "✓" },
    reject: { bg: "#FBE7E6", fg: "#D9534F", glyph: "–" },
    doc: { bg: "#EAF0F7", fg: "#5B7CC2", glyph: "▤" },
    sla: { bg: "#FCEBD0", fg: "#D98016", glyph: "!" },
    submit: { bg: "#EAF0F7", fg: "#5B7CC2", glyph: "↑" },
  };
  const s = map[type] || map.doc;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.glyph}
    </span>
  );
}

/* ---------- page ---------- */
export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();

        // ----- shelters (from users) -----
        const usersSnap = await getDocs(collection(db, "users"));
        const shelters = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "shelter")
          .map((u) => ({
            id: u.id,
            name: u.orgName || u.fullName || u.name || "Unnamed shelter",
            place: u.location || u.city || u.state || "Malaysia",
            status: u.verificationStatus || null,
            created: toDate(u.createdAt),
            verifiedAt: toDate(u.verifiedAt),
          }));

        // missing status is grandfathered in as approved/active
        const isActive = (s) => (s.status ? s.status === "approved" : true);
        const inQueue = (s) => s.status === "pending" || s.status === "review";

        const queueList = shelters
          .filter(inQueue)
          .sort(
            (a, b) => (a.created?.getTime() || 0) - (b.created?.getTime() || 0)
          );
        const reviewCount = queueList.filter((s) => s.status === "review").length;
        const activeShelters = shelters.filter(isActive).length;

        let pendingSub;
        if (queueList.length === 0) pendingSub = "queue is clear";
        else if (reviewCount > 0) pendingSub = `${reviewCount} in review`;
        else pendingSub = "awaiting first review";

        // ----- pets -----
        const petsSnap = await getDocs(collection(db, "pets"));
        const petsCount = petsSnap.size;

        // ----- applications -----
        const appsSnap = await getDocs(collection(db, "applications"));
        const apps = appsSnap.docs
          .map((d) => d.data())
          .map((a) => ({
            status: (a.status || "").toLowerCase(),
            created: toDate(a.createdAt),
          }));

        const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const approvedThisMonth = apps.filter(
          (a) => APPROVED_STATUSES.includes(a.status) && sameMonth(a.created, now)
        ).length;
        const approvedLastMonth = apps.filter(
          (a) =>
            APPROVED_STATUSES.includes(a.status) &&
            sameMonth(a.created, lastMonthRef)
        ).length;

        let adoptionsSub;
        if (approvedLastMonth > 0) {
          const pct = Math.round(
            ((approvedThisMonth - approvedLastMonth) / approvedLastMonth) * 100
          );
          adoptionsSub = `${pct >= 0 ? "+" : ""}${pct}% vs last month`;
        } else if (approvedThisMonth > 0) {
          adoptionsSub = "new this month";
        } else {
          adoptionsSub = "no adoptions yet";
        }

        // ----- inbound volume (applications per day, last 30 days) -----
        const buckets = new Array(30).fill(0);
        apps.forEach((a) => {
          if (!a.created) return;
          const diff = Math.floor((now - a.created) / 86400000);
          if (diff >= 0 && diff < 30) buckets[29 - diff] += 1;
        });
        const maxB = Math.max(1, ...buckets);
        const inbound = buckets.map((v) => v / maxB);

        // ----- SLA -----
        const overdue = queueList.filter(
          (s) => s.created && (now - s.created) / 3600000 > SLA_HOURS
        );
        const oldest = queueList[0];
        let slaAlert = null;
        if (oldest && oldest.created && (now - oldest.created) / 3600000 > SLA_HOURS) {
          slaAlert = {
            name: oldest.name,
            days: Math.floor((now - oldest.created) / 86400000),
          };
        }

        // ----- recent activity (derived from newest shelters + applications) -----
        const activity = shelters
          .filter((s) => s.status) // only shelters that entered the verification flow
          .map((s) => {
            let type = "submit";
            let verb = "applied for verification";
            let date = s.created;
            if (s.status === "approved") {
              type = "approve";
              verb = "was approved";
              date = s.verifiedAt || s.created;
            } else if (s.status === "rejected") {
              type = "reject";
              verb = "was rejected";
              date = s.verifiedAt || s.created;
            } else if (s.status === "review") {
              verb = "is under review";
            }
            return { type, actor: s.name, verb, date };
          })
          .filter((a) => a.date)
          .sort((x, y) => y.date - x.date)
          .slice(0, 5)
          .map((a) => ({ ...a, ago: agoLabel(a.date) }));

        const dateLabel =
          now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }) + " · all shelters, Malaysia";

        setData({
          dateLabel,
          kpis: {
            pendingVerifications: queueList.length,
            pendingSub,
            activeShelters,
            activeSheltersSub: `${petsCount} pets listed`,
            adoptionsThisMonth: approvedThisMonth,
            adoptionsSub,
          },
          slaAlert,
          pastSla: overdue.length,
          queue: queueList.map((s) => ({
            id: s.id,
            name: s.name,
            place: s.place,
            ago: agoLabel(s.created),
            status: s.status === "review" ? "In review" : "Pending review",
          })),
          inbound,
          inboundHighlightFrom: 25,
          activity,
        });
      } catch (e) {
        console.error("Admin overview load failed:", e);
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openReview = () => navigate("/admin/verification");

  return (
    <div className="flex min-h-screen bg-[#F5F0E8] text-[#2A2118]">
      <AdminSidebar
        adminName={ADMIN_NAME}
        pendingCount={data?.kpis?.pendingVerifications || 0}
      />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* top bar */}
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FCEBD0] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C2650B]">
            <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
            Internal Tooling
          </span>

          <div className="flex items-center gap-4">
            {data?.pastSla > 0 && (
              <span className="flex items-center gap-2 text-sm font-bold text-[#C0442F]">
                ⏰ {data.pastSla} review{data.pastSla > 1 ? "s" : ""} past SLA
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
        <h1 className="text-3xl font-extrabold">Platform overview</h1>
        <p className="mt-1 text-sm font-medium text-[#9A8B76]">
          {loading ? "Loading live data…" : data?.dateLabel}
        </p>

        {loading ? (
          <div className="mt-10 text-center text-sm font-medium text-[#9A8B76]">
            Fetching shelters, pets and applications…
          </div>
        ) : data?.error ? (
          <div className="mt-6 rounded-3xl border border-[#F3D6D0] bg-[#FCEBEA] px-5 py-4 text-sm font-medium text-[#9B3B2E]">
            Couldn't load data. Check the browser console for details.
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Pending verifications" value={data.kpis.pendingVerifications} sub={data.kpis.pendingSub} highlight />
              <KpiCard label="Active shelters" value={data.kpis.activeShelters} sub={data.kpis.activeSheltersSub} />
              <KpiCard label="Adoptions this month" value={data.kpis.adoptionsThisMonth} sub={data.kpis.adoptionsSub} />
            </div>

            {/* SLA banner */}
            {data.slaAlert && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-[#F3D6D0] bg-[#FCEBEA] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <div className="font-bold text-[#9B3B2E]">
                      {data.slaAlert.name} has been waiting {data.slaAlert.days} days
                    </div>
                    <div className="text-sm text-[#B26A5F]">
                      This shelter can't list pets until it's approved. Review target is 48 hours.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/admin/verification")}
                  className="shrink-0 rounded-2xl bg-[#A94436] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#93372B]"
                >
                  Review now
                </button>
              </div>
            )}

            {/* body */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
              {/* verification queue */}
              <div className="rounded-3xl border border-[#EFE9DF] bg-white p-5">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold">Verification queue</h2>
                    <p className="text-sm text-[#9A8B76]">
                      Oldest first, these block shelters from listing pets
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/verification")}
                    className="text-sm font-bold text-[#C2650B] hover:underline"
                  >
                    Open queue →
                  </button>
                </div>
                <div className="mt-2 divide-y divide-[#F1EBE0]">
                  {data.queue.length === 0 ? (
                    <div className="py-8 text-center text-sm font-medium text-[#9A8B76]">
                      No shelters awaiting verification.
                    </div>
                  ) : (
                    data.queue.map((item) => (
                      <QueueRow key={item.id} item={item} onReview={openReview} />
                    ))
                  )}
                </div>
              </div>

              {/* right column */}
              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-[#EFE9DF] bg-white p-5">
                  <h2 className="text-lg font-extrabold">Inbound volume</h2>
                  <p className="text-sm text-[#9A8B76]">Applications received, last 30 days</p>
                  <InboundChart data={data.inbound} highlightFrom={data.inboundHighlightFrom} />
                </div>

                <div className="rounded-3xl border border-[#EFE9DF] bg-white p-5">
                  <h2 className="mb-3 text-lg font-extrabold">Recent activity</h2>
                  <div className="flex flex-col gap-3.5">
                    {data.activity.length === 0 ? (
                      <div className="text-sm font-medium text-[#9A8B76]">No recent activity.</div>
                    ) : (
                      data.activity.map((a, i) => (
                        <div key={i} className="flex gap-3">
                          <ActivityDot type={a.type} />
                          <div className="text-sm leading-snug">
                            <span className="font-bold">{a.actor}</span>{" "}
                            <span className="text-[#6B6153]">{a.verb}</span>
                            <div className="text-xs text-[#A08A6C]">{a.ago}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}