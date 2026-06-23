import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const SPECIES_BG = {
  dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F9BFBF",
  bird: "#C4E0F2", other: "#D4F2C4",
};
const SPECIES_EMOJI = {
  dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", other: "🐾",
};
const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)";

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  if (months > 0) return `${months} mo${months !== 1 ? "s" : ""}`;
  return "—";
}

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 86400) return "today";
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

function StatusBadge({ status }) {
  const map = {
    available: { bg: "#DCFCE7", color: "#16A34A", label: "Available" },
    reviewing: { bg: "#FEF3C7", color: "#92400E", label: "Reviewing" },
    adopted:   { bg: "#F3F4F6", color: "#6B7280", label: "Adopted" },
    draft:     { bg: "#F3F4F6", color: "#9CA3AF", label: "Draft" },
  };
  const s = map[(status || "").toLowerCase()] || { bg: "#F3F4F6", color: "#6B7280", label: status };
  return (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function ShelterPetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicantCount, setApplicantCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const petDoc = await getDoc(doc(db, "pets", id));
        if (!petDoc.exists()) return;
        setPet({ id: petDoc.id, ...petDoc.data() });

        const appSnap = await getDocs(
          query(collection(db, "applications"), where("petId", "==", id))
        );
        setApplicantCount(appSnap.size);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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

  if (!pet) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <p style={{ color: "#9B8778" }}>Pet not found.</p>
      </div>
    );
  }

  const bg = SPECIES_BG[pet.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[pet.species?.toLowerCase()] ?? "🐾";
  const age = formatAge(pet.ageYears, pet.ageMonths);
  const area = pet.address?.split(",").slice(0, 2).join(",").trim() ?? pet.address ?? "";
  const photo = pet.photoUrls?.[0] ?? null;
  const speciesLabel = pet.species ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase() : "—";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Back */}
          <button
            onClick={() => navigate("/shelter/listings")}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to listings
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black" style={{ color: "#3D2B1F" }}>{pet.name}</h1>
                <span className="text-lg" style={{ color: "#9B8778" }}>
                  {(pet.gender || "").toLowerCase() === "female" ? "♀" : "♂"}
                </span>
                <StatusBadge status={pet.status} />
              </div>
              <p className="text-sm" style={{ color: "#9B8778" }}>
                {pet.breed} · {age} · Added {timeAgo(pet.createdAt)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/shelter/applications?petId=${id}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ backgroundColor: "white", border: "1.5px solid #EEE8E0", color: "#6B5E52" }}
              >
                📋 {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => navigate(`/shelter/edit-pet/${id}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: "#F5A623" }}
              >
                ✏️ Edit pet profile
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex gap-6">

            {/* Left */}
            <div className="flex flex-col gap-4" style={{ width: 480 }}>
              {/* Main photo */}
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ height: 420, backgroundColor: bg, backgroundImage: photo ? "none" : STRIPE_BG }}
              >
                {photo
                  ? <img src={photo} alt={pet.name} className="w-full h-full object-cover" />
                  : <span style={{ fontSize: 120 }}>{emoji}</span>
                }
              </div>

              {/* About */}
              {pet.description && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>About {pet.name}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{pet.description}</p>
                </div>
              )}

              {/* Personality */}
              {pet.personality?.length > 0 && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Personality</h3>
                  <div className="flex gap-2 flex-wrap">
                    {pet.personality.map((trait) => (
                      <span
                        key={trait}
                        className="text-sm px-3 py-1 rounded-full font-semibold"
                        style={{ backgroundColor: "#FFF3E0", color: "#F5A623", border: "1px solid #F5A623" }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="flex-1 flex flex-col gap-4">

              {/* Engagement */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-4" style={{ color: "#3D2B1F" }}>Engagement</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: "❤️", value: pet.likes ?? 0, label: "Likes" },
                    { icon: "🐾", value: applicantCount, label: "Applicants" },
                    { icon: "👀", value: pet.views ?? 0, label: "Views" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: "#F5F2EE" }}>
                      <p className="text-2xl mb-1">{s.icon}</p>
                      <p className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pet details */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-4" style={{ color: "#3D2B1F" }}>Pet details</h3>
                {[
                  { label: "Species", value: speciesLabel },
                  { label: "Breed", value: pet.breed ?? "—" },
                  { label: "Age", value: age },
                  { label: "Gender", value: pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : "—" },
                  { label: "Vaccinated", value: pet.vaccinated ? "Yes" : "No" },
                  { label: "Neutered", value: pet.neutered ? "Yes" : "No" },
                ].map((item, i, arr) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-3"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid #F5F2EE" : "none" }}
                  >
                    <p className="text-sm" style={{ color: "#9B8778" }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Status info */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-1" style={{ color: "#3D2B1F" }}>Status will update automatically</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9B8778" }}>
                  When you approve an applicant and they confirm, {pet.name}'s listing will close and the status will change to{" "}
                  <span className="font-bold" style={{ color: "#3D2B1F" }}>Adopted</span>.
                </p>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}