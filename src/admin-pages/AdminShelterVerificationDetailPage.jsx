// src/admin-pages/AdminShelterVerificationDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import AdminSidebar from "../components/AdminSidebar";

const ADMIN_NAME = "Liyana Afiera";

// Build a flat list of viewable documents from the shelter's `documents` map.
// Handles single-URL fields and multi-file fields (stored as arrays or as
// {0:..,1:..} maps). Each row gets its own working View link.
function buildDocRows(documents) {
  if (!documents || typeof documents !== "object") return [];
  const asArray = (v) =>
    Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
  const rows = [];
  const add = (url, label) => {
    if (url) rows.push({ label, url });
  };
  add(documents.ssmCert, "SSM registration certificate");
  asArray(documents.premisePhotos).forEach((u, i) =>
    add(u, `Premises photo ${i + 1}`)
  );
  add(documents.dvsLicence, "DVS animal facility licence");
  add(documents.vetLetter, "Vet partnership letter");
  asArray(documents.otherDocs).forEach((u, i) =>
    add(u, `Other document ${i + 1}`)
  );
  return rows;
}

/* ---------- helpers ---------- */
function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function Info({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#A08A6C]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#2A2118]">{children}</div>
    </div>
  );
}

function Check({ ok, label }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md text-xs font-bold"
        style={
          ok
            ? { backgroundColor: "#E6F4EA", color: "#2E9E5B" }
            : { backgroundColor: "#F1ECE3", color: "#B7A98F" }
        }
      >
        {ok ? "✓" : "–"}
      </span>
      <span className={`text-sm ${ok ? "text-[#3B342B]" : "text-[#A08A6C]"}`}>{label}</span>
    </div>
  );
}

/* ---------- page ---------- */
export default function AdminShelterVerificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shelter, setShelter] = useState(null);
  const [petsWaiting, setPetsWaiting] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", id));
        if (!snap.exists()) {
          setShelter({ notFound: true });
          return;
        }
        const u = snap.data();
        setShelter({
          id,
          name: u.orgName || u.fullName || u.name || "Unnamed shelter",
          place: u.location || u.city || u.state || "Malaysia",
          contact: u.fullName || u.name || "—",
          email: u.email || "—",
          phone: u.phone || "—",
          ssmNumber: u.ssmNumber || "—",
          website: u.website || "",
          description: u.description || "",
          status: u.verificationStatus || "approved",
          created: toDate(u.createdAt),
          documents: u.documents || null,
        });
        setNote(u.rejectionReason || u.reviewerNote || "");

        const petsSnap = await getDocs(
          query(collection(db, "pets"), where("ownerId", "==", id))
        );
        setPetsWaiting(petsSnap.size);
      } catch (e) {
        console.error("Shelter detail load failed:", e);
        setShelter({ error: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const decide = async (decision) => {
    setError("");
    if (decision === "rejected" && !note.trim()) {
      setError("Please add a note explaining why this shelter is rejected. It will be shown to the shelter.");
      return;
    }
    setSaving(true);
    try {
      const payload =
        decision === "approved"
          ? {
              verificationStatus: "approved",
              verifiedAt: serverTimestamp(),
              reviewerNote: note.trim() || null,
              rejectionReason: null,
            }
          : {
              verificationStatus: "rejected",
              rejectedAt: serverTimestamp(),
              rejectionReason: note.trim(),
              reviewerNote: note.trim(),
            };
      await updateDoc(doc(db, "users", id), payload);
      navigate("/admin/verification");
    } catch (e) {
      console.error("Decision failed:", e);
      setError("Couldn't save the decision. Please try again.");
      setSaving(false);
    }
  };

  const docRows = shelter ? buildDocRows(shelter.documents) : [];

  return (
    <div className="flex min-h-screen bg-[#F5F0E8] text-[#2A2118]">
      <AdminSidebar adminName={ADMIN_NAME} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <button
          onClick={() => navigate("/admin/verification")}
          className="mb-5 text-sm font-bold text-[#C2650B] hover:underline"
        >
          ← Back to queue
        </button>

        {loading ? (
          <div className="mt-10 text-center text-sm font-medium text-[#9A8B76]">Loading shelter…</div>
        ) : shelter?.notFound ? (
          <div className="rounded-3xl border border-[#F3D6D0] bg-[#FCEBEA] px-5 py-4 text-sm font-medium text-[#9B3B2E]">
            This shelter could not be found.
          </div>
        ) : shelter?.error ? (
          <div className="rounded-3xl border border-[#F3D6D0] bg-[#FCEBEA] px-5 py-4 text-sm font-medium text-[#9B3B2E]">
            Couldn't load this shelter. Check the browser console.
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {/* header card */}
            <div className="rounded-3xl border border-[#EFE9DF] bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5A623] text-2xl font-extrabold text-white">
                  {shelter.name[0]}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold">{shelter.name}</h1>
                  <p className="text-sm font-medium text-[#9A8B76]">{shelter.place}</p>
                </div>
              </div>
              <div className="mt-4">
                <StatusPill status={shelter.status} />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[#F1EBE0] pt-6">
                <Info label="Contact">{shelter.contact}</Info>
                <Info label="Submitted">{fmtDate(shelter.created)}</Info>
                <Info label="SSM number">{shelter.ssmNumber}</Info>
                <Info label="Pets waiting">{petsWaiting || "—"}</Info>
                <Info label="Email">{shelter.email}</Info>
                <Info label="Phone">{shelter.phone}</Info>
                <Info label="Website">
                  {shelter.website ? (
                    <a
                      href={shelter.website.startsWith("http") ? shelter.website : `https://${shelter.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C2650B] hover:underline"
                    >
                      {shelter.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </Info>
              </div>

              {shelter.description && (
                <div className="mt-6 border-t border-[#F1EBE0] pt-6">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A08A6C]">
                    About
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#4A4034]">
                    {shelter.description}
                  </p>
                </div>
              )}
            </div>

            {/* documents */}
            <div className="rounded-3xl border border-[#EFE9DF] bg-white p-6">
              <h2 className="mb-4 text-lg font-extrabold">Documents</h2>
              {docRows.length === 0 ? (
                <div className="text-sm font-medium text-[#9A8B76]">
                  No documents uploaded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {docRows.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-[#FBF7F0] px-4 py-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E6F4EA] text-xs font-bold text-[#2E9E5B]">
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-[#2A2118]">
                          {d.label}
                        </div>
                        <div className="text-xs font-medium text-[#2E9E5B]">
                          Uploaded
                        </div>
                      </div>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-sm font-bold text-[#C2650B] hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* decision: show result if already decided, else the action block */}
            {shelter.status === "approved" || shelter.status === "rejected" ? (
              <div className="rounded-3xl border border-[#EFE9DF] bg-white p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
                    style={
                      shelter.status === "approved"
                        ? { backgroundColor: "#E6F4EA", color: "#2E9E5B" }
                        : { backgroundColor: "#FBE7E6", color: "#D9534F" }
                    }
                  >
                    {shelter.status === "approved" ? "✓" : "✕"}
                  </span>
                  <div>
                    <div
                      className="text-lg font-extrabold"
                      style={{ color: shelter.status === "approved" ? "#1F7A45" : "#B23B36" }}
                    >
                      {shelter.status === "approved" ? "Application accepted" : "Application rejected"}
                    </div>
                    <div className="text-sm text-[#9A8B76]">
                      {shelter.status === "approved"
                        ? "This shelter is approved and can publish pet listings."
                        : "This shelter has been rejected."}
                    </div>
                  </div>
                </div>

                {shelter.status === "rejected" && note && (
                  <div className="mt-4 rounded-2xl border border-[#F1D3D1] bg-[#FCECEB] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#B23B36]">
                      Reason sent to shelter
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#7A3A36]">{note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-[#EFE9DF] bg-white p-6">
                <label className="block text-lg font-extrabold">Note to shelter</label>
                <p className="mb-3 text-sm text-[#9A8B76]">
                  Required when rejecting. This message is shown to the shelter as the reason.
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="e.g. SSM registration could not be verified. Please resubmit with a valid certificate."
                  className="w-full resize-none rounded-2xl border border-[#EDE7DC] bg-[#FBF9F5] px-4 py-3 text-sm text-[#2A2118] placeholder-[#B7A98F] focus:border-[#F5A623] focus:outline-none"
                />

                {error && (
                  <div className="mt-3 rounded-xl bg-[#FCECEB] px-4 py-3 text-sm font-medium text-[#B23B36]">
                    {error}
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => decide("approved")}
                    disabled={saving}
                    className="w-full rounded-2xl bg-[#3FA060] py-3.5 text-sm font-bold text-white hover:bg-[#358552] disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Approve shelter"}
                  </button>
                  <button
                    onClick={() => decide("rejected")}
                    disabled={saving}
                    className="w-full rounded-2xl border border-[#F1D3D1] bg-white py-3.5 text-sm font-bold text-[#C0442F] hover:bg-[#FCECEB] disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}