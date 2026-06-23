import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const STATUS_TABS = ["All", "Available", "Reviewing", "Adopted"];

const SPECIES_EMOJI = {
  cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🦜", other: "🐾",
  Cat: "🐱", Dog: "🐶", Rabbit: "🐰", Bird: "🦜", Other: "🐾",
};

const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)";

function StatusBadge({ status }) {
  const map = {
    available: { bg: "#22C55E", label: "Available" },
    reviewing: { bg: "#F59E0B", label: "Reviewing" },
    adopted:   { bg: "#6366F1", label: "Adopted" },
    draft:     { bg: "#9CA3AF", label: "Draft" },
  };
  const s = map[(status || "").toLowerCase()] || { bg: "#9CA3AF", label: status };
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
      style={{ backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

// ─── Pet Card (Grid) ─────────────────────────────────────────────────────────
function PetCard({ pet, applicantCounts, navigate }) {
  const emoji = SPECIES_EMOJI[(pet.species || "").toLowerCase()] || "🐾";
  const count = applicantCounts[pet.id] || 0;
  const hasPhoto = pet.photoUrls?.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg"
      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
      onClick={() => navigate(`/shelter/listings/${pet.id}`)}
    >
      {/* Photo area */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 220,
          backgroundColor: "#F9C4B0",
          backgroundImage: hasPhoto ? "none" : STRIPE_BG,
        }}
      >
        {hasPhoto ? (
          <img src={pet.photoUrls[0]} className="w-full h-full object-cover" alt={pet.name} />
        ) : (
          <span style={{ fontSize: 72 }}>{emoji}</span>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={pet.status} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{pet.name}</p>
          <span className="text-sm" style={{ color: "#9B8778" }}>
            {pet.gender === "Female" || pet.gender === "female" ? "♀" : "♂"}
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: "#9B8778" }}>
          {pet.breed}{pet.ageYears || pet.ageMonths ? ` · ${pet.ageYears || 0}yr${pet.ageMonths ? ` ${pet.ageMonths}mo` : ""}` : ""}
        </p>
        <div className="flex items-center justify-between text-xs" style={{ color: "#9B8778" }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span style={{ color: "#EF4444" }}>♥</span> {pet.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <span>👤</span> {count}
            </span>
          </div>
          <span>{timeAgo(pet.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Pet List Table ───────────────────────────────────────────────────────────
function PetListTable({ pets, applicantCounts, navigate }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
      {/* Table header */}
      <div
        className="grid text-xs font-bold px-5 py-3"
        style={{
          gridTemplateColumns: "2.5fr 1fr 1fr 0.7fr 1fr 1fr 40px",
          color: "#9B8778",
          borderBottom: "1px solid #EEE8E0",
        }}
      >
        <span>PET</span>
        <span>SPECIES</span>
        <span>AGE</span>
        <span>LIKES</span>
        <span>APPLICANTS</span>
        <span>STATUS</span>
        <span />
      </div>

      {/* Rows */}
      {pets.map((pet, i) => {
        const emoji = SPECIES_EMOJI[(pet.species || "").toLowerCase()] || "🐾";
        const count = applicantCounts[pet.id] || 0;
        const hasPhoto = pet.photoUrls?.length > 0;
        const ageStr = pet.ageYears > 0
          ? `${pet.ageYears} yr${pet.ageYears > 1 ? "s" : ""}`
          : pet.ageMonths > 0
          ? `${pet.ageMonths} mo${pet.ageMonths > 1 ? "s" : ""}`
          : "—";
        const speciesLabel = pet.species
          ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()
          : "—";

        return (
          <div
            key={pet.id}
            className="grid items-center px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors relative"
            style={{
              gridTemplateColumns: "2.5fr 1fr 1fr 0.7fr 1fr 1fr 40px",
              borderTop: i === 0 ? "none" : "1px solid #F3F4F6",
            }}
            onClick={() => navigate(`/shelter/listings/${pet.id}`)}
          >
            {/* Pet name + photo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: "#F9C4B0", backgroundImage: hasPhoto ? "none" : STRIPE_BG }}
              >
                {hasPhoto
                  ? <img src={pet.photoUrls[0]} className="w-full h-full object-cover" alt={pet.name} />
                  : <span style={{ fontSize: 20 }}>{emoji}</span>
                }
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>{pet.name}</p>
                <p className="text-xs" style={{ color: "#9B8778" }}>{pet.breed || "—"}</p>
              </div>
            </div>

            <span className="text-sm" style={{ color: "#3D2B1F" }}>{speciesLabel}</span>
            <span className="text-sm" style={{ color: "#3D2B1F" }}>{ageStr}</span>
            <span className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{pet.likes || 0}</span>
            <span className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{count}</span>
            <span><StatusBadge status={pet.status} /></span>

            {/* Menu */}
            <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setOpenMenu(openMenu === pet.id ? null : pet.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-lg font-bold"
                style={{ color: "#9B8778" }}
              >
                ···
              </button>
              {openMenu === pet.id && (
                <div
                  className="absolute right-0 top-9 z-20 rounded-xl shadow-lg py-1 min-w-32"
                  style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                >
                  <button
                    onClick={() => { setOpenMenu(null); navigate(`/shelter/listings/${pet.id}`); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: "#3D2B1F" }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => { setOpenMenu(null); navigate(`/shelter/edit-pet/${pet.id}`); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: "#3D2B1F" }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShelterListingsPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [pets, setPets] = useState([]);
  const [applicantCounts, setApplicantCounts] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchPets();
  }, [user]);

  async function fetchPets() {
    try {
      const petsSnap = await getDocs(
        query(collection(db, "pets"), where("ownerId", "==", user.uid))
      );
      const allPets = petsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() || 0;
          const tb = b.createdAt?.toDate?.()?.getTime() || 0;
          return tb - ta;
        });
      setPets(allPets);

      // Fetch applicant counts
      const petIds = allPets.map((p) => p.id);
      const counts = {};
      if (petIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < petIds.length; i += 30) chunks.push(petIds.slice(i, i + 30));
        for (const chunk of chunks) {
          const appSnap = await getDocs(
            query(collection(db, "applications"), where("petId", "in", chunk))
          );
          appSnap.docs.forEach((d) => {
            const pid = d.data().petId;
            counts[pid] = (counts[pid] || 0) + 1;
          });
        }
      }
      setApplicantCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeTab === "All"
    ? pets
    : pets.filter((p) => (p.status || "").toLowerCase() === activeTab.toLowerCase());

  // Tab counts
  const tabCounts = {
    All: pets.length,
    Available: pets.filter((p) => (p.status || "").toLowerCase() === "available").length,
    Reviewing: pets.filter((p) => (p.status || "").toLowerCase() === "reviewing").length,
    Adopted: pets.filter((p) => (p.status || "").toLowerCase() === "adopted").length,
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F9F5F0" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar orgName={orgName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>Pet Listings</h1>
              <p className="text-sm mt-0.5" style={{ color: "#9B8778" }}>
                {pets.length} pet{pets.length !== 1 ? "s" : ""} in your care
              </p>
            </div>
            <button
              onClick={() => navigate("/shelter/post-pet")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: "#F5A623" }}
            >
              + Add a pet
            </button>
          </div>

          {/* Tabs + View toggle */}
          <div className="flex items-center justify-between mb-5">
            <div style={{ display: "inline-flex", padding: 4, borderRadius: 16, backgroundColor: "#EEEBE6" }}>
              {STATUS_TABS.map((tab) => (
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
            {/* Grid / List toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                style={{ backgroundColor: viewMode === "grid" ? "#F5A623" : "transparent" }}
              >
                <span style={{ color: viewMode === "grid" ? "white" : "#9B8778", fontSize: 16 }}>⊞</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition"
                style={{ backgroundColor: viewMode === "list" ? "#F5A623" : "transparent" }}
              >
                <span style={{ color: viewMode === "list" ? "white" : "#9B8778", fontSize: 16 }}>☰</span>
              </button>
            </div>
          </div>

          {/* Pet grid / list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-5xl mb-4">🐾</span>
              <p className="font-bold text-base mb-1" style={{ color: "#3D2B1F" }}>No pets here yet</p>
              <p className="text-sm mb-5" style={{ color: "#9B8778" }}>
                {activeTab === "All" ? "Add your first pet listing to get started." : `No ${activeTab.toLowerCase()} pets.`}
              </p>
              {activeTab === "All" && (
                <button
                  onClick={() => navigate("/shelter/post-pet")}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#F5A623" }}
                >
                  + Add a pet
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((pet) => (
                <PetCard key={pet.id} pet={pet} applicantCounts={applicantCounts} navigate={navigate} />
              ))}
            </div>
          ) : (
            <PetListTable pets={filtered} applicantCounts={applicantCounts} navigate={navigate} />
          )}
        </main>
      </div>
    </div>
  );
}