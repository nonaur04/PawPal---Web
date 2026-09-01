// src/pages/AdminOverviewPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

/*
  DATA
  ----
  Everything the page shows is assembled in `overview` below. Right now it holds
  sample values that match the mockup so the page renders fully on paste.

  To go live, replace these fields with Firestore queries (see the notes next to
  each block). Nothing else in the component needs to change.
*/
const overview = {
  // subtitle under the title. Kept Malaysia-wide to match the report scope.
  dateLabel: "Tuesday, 1 September 2026 · all shelters, Malaysia",

  kpis: {
    // pendingVerifications: count of shelter users with verificationStatus in
    //   ["pending", "awaiting_docs"]
    pendingVerifications: 5,
    pendingSub: "2 awaiting documents",
    // activeShelters: count of shelter users with verificationStatus === "verified"
    activeShelters: 34,
    activeSheltersSub: "412 pets listed", // count of docs in `pets`
    // adoptionsThisMonth: applications approved within the current month
    adoptionsThisMonth: 68,
    adoptionsSub: "+14% vs last month",
    avgReviewTime: "19h",
    avgReviewSub: "Target: under 48h",
  },

  // oldest shelter still waiting past the review target. null hides the banner.
  slaAlert: { name: "Kucing Kita Collective", days: 6, pets: 6 },

  // shelter users needing review, oldest first
  queue: [
    { id: "1", name: "Kucing Kita Collective", place: "Alor Gajah, Melaka", ago: "6 days ago", status: "Pending review" },
    { id: "2", name: "Furry Friends Foundation", place: "Klebang, Melaka", ago: "5 days ago", status: "Awaiting docs" },
    { id: "3", name: "Second Chance Animal Rescue", place: "Bukit Beruang, Melaka", ago: "3 days ago", status: "Pending review" },
    { id: "4", name: "Melaka Paws Sanctuary", place: "Ayer Keroh, Melaka", ago: "2 days ago", status: "Pending review" },
    { id: "5", name: "Hope Haven Shelter", place: "Masjid Tanah, Melaka", ago: "1 day ago", status: "Pending review" },
  ],

  // applications received per day, last 30 days (values 0..1 for bar height)
  inbound: [
    0.35, 0.22, 0.4, 0.3, 0.5, 0.28, 0.34, 0.6, 0.42, 0.55, 0.38, 0.7, 0.33,
    0.48, 0.3, 0.44, 0.52, 0.36, 0.58, 0.4, 0.34, 0.62, 0.46, 0.5, 0.42,
    0.9, 0.72, 0.98, 0.68, 0.82,
  ],
  inboundHighlightFrom: 25, // bars from this index are "this week" (orange)

  activity: [
    { type: "approve", actor: "Faiz Rahman", verb: "approved", target: "Melaka Animal Haven", ago: "3 weeks ago" },
    { type: "doc", actor: "Faiz Rahman", verb: "requested documents from", target: "Furry Friends Foundation", ago: "2 days ago" },
    { type: "sla", actor: "System", verb: "flagged SLA risk on", target: "Furry Friends Foundation", ago: "1 day ago" },
    { type: "submit", actor: "Hope Haven Shelter", verb: "submitted an application", target: "80-pet capacity", ago: "1 day ago" },
    { type: "reject", actor: "Faiz Rahman", verb: "rejected", target: "Pet Rescue Squad MY", ago: "1 month ago" },
  ],
};

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
        highlight
          ? "border-[#F3D39A] bg-[#FCEBD0]"
          : "border-[#EFE9DF] bg-white"
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
  const k = overview.kpis;
  const pastSla = overview.slaAlert ? 1 : 0;

  const openReview = (item) => {
    // send to the verification detail / queue. Adjust the path to your route.
    navigate(`/admin/verification`);
  };

  return (
    <div className="flex min-h-screen bg-[#F5F0E8] text-[#2A2118]">
      <AdminSidebar
        adminName="Faiz Rahman"
        pendingCount={overview.kpis.pendingVerifications}
      />

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
                ⏰ {pastSla} review past SLA
              </span>
            )}
            <div className="flex items-center gap-2.5 rounded-full border border-[#EFE9DF] bg-white py-1 pl-1 pr-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A623] text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5l8-3z" />
                </svg>
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold">Faiz Rahman</div>
                <div className="text-xs text-[#9A8B76]">Platform Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* title */}
        <h1 className="text-3xl font-extrabold">Platform overview</h1>
        <p className="mt-1 text-sm font-medium text-[#9A8B76]">
          {overview.dateLabel}
        </p>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Pending verifications" value={k.pendingVerifications} sub={k.pendingSub} highlight />
          <KpiCard label="Active shelters" value={k.activeShelters} sub={k.activeSheltersSub} />
          <KpiCard label="Adoptions this month" value={k.adoptionsThisMonth} sub={k.adoptionsSub} />
          <KpiCard label="Avg. review time" value={k.avgReviewTime} sub={k.avgReviewSub} />
        </div>

        {/* SLA banner */}
        {overview.slaAlert && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-[#F3D6D0] bg-[#FCEBEA] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <div className="font-bold text-[#9B3B2E]">
                  {overview.slaAlert.name} has been waiting {overview.slaAlert.days} days
                </div>
                <div className="text-sm text-[#B26A5F]">
                  {overview.slaAlert.pets} pets can't be listed until this shelter is verified. Review target is 48 hours.
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

        {/* two-column body */}
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
              {overview.queue.map((item) => (
                <QueueRow key={item.id} item={item} onReview={openReview} />
              ))}
            </div>
          </div>

          {/* right column */}
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-[#EFE9DF] bg-white p-5">
              <h2 className="text-lg font-extrabold">Inbound volume</h2>
              <p className="text-sm text-[#9A8B76]">Applications received, last 30 days</p>
              <InboundChart data={overview.inbound} highlightFrom={overview.inboundHighlightFrom} />
            </div>

            <div className="rounded-3xl border border-[#EFE9DF] bg-white p-5">
              <h2 className="mb-3 text-lg font-extrabold">Recent activity</h2>
              <div className="flex flex-col gap-3.5">
                {overview.activity.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <ActivityDot type={a.type} />
                    <div className="text-sm leading-snug">
                      <span className="font-bold">{a.actor}</span>{" "}
                      <span className="text-[#6B6153]">{a.verb}</span>{" "}
                      <span className="font-bold">{a.target}</span>
                      <div className="text-xs text-[#A08A6C]">{a.ago}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}