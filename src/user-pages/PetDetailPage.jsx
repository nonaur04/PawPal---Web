import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = {
  dog: "#F9BFBF",
  cat: "#F9BFBF",
  rabbit: "#F2C4A0",
  bird: "#C4E0F2",
  others: "#D4F2C4",
};

const SPECIES_EMOJI = {
  dog: "🐕",
  cat: "🐱",
  rabbit: "🐇",
  bird: "🦜",
  others: "🐾",
};

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo${months !== 1 ? "s" : ""}`;
}

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [liked, setLiked] = useState(false);
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const petDoc = await getDoc(doc(db, "pets", id));
        if (!petDoc.exists()) return;
        const data = { id: petDoc.id, ...petDoc.data() };
        setPet(data);

        if (data.ownerId) {
          const ownerDoc = await getDoc(doc(db, "users", data.ownerId));
          if (ownerDoc.exists()) setShelter(ownerDoc.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPet();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <p style={{ color: "#9B8778" }}>Loading...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <p style={{ color: "#9B8778" }}>Pet not found.</p>
      </div>
    );
  }

  const bg = SPECIES_BG[pet.species?.toLowerCase()] ?? "#F9BFBF";
  const emoji = SPECIES_EMOJI[pet.species?.toLowerCase()] ?? "🐾";
  const photos = pet.photoUrls?.length ? pet.photoUrls : [null];
  const age = formatAge(pet.ageYears, pet.ageMonths);
  const area = pet.address?.split(",").slice(0, 2).join(",").trim() ?? pet.address ?? "";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm font-semibold mb-5"
              style={{ color: "#6B5E52" }}
            >
              ‹ Back to discover
            </button>

            <div className="flex gap-8">
              {/* Left: photos */}
              <div className="flex flex-col gap-3" style={{ width: 420 }}>
                <div
                  className="rounded-2xl overflow-hidden flex items-center justify-center relative"
                  style={{
                    height: 400,
                    backgroundColor: bg,
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)",
                    flexShrink: 0,
                  }}
                >
                  {photos[activePhoto] ? (
                    <img src={photos[activePhoto]} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ fontSize: 100 }}>{emoji}</span>
                  )}
                  <button
                    onClick={() => setLiked(!liked)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow text-lg"
                  >
                    {liked ? "❤️" : "🤍"}
                  </button>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-3">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className="rounded-xl overflow-hidden flex items-center justify-center flex-1"
                      style={{
                        height: 80,
                        backgroundColor: bg,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)",
                        border: activePhoto === i ? "2.5px solid #F5A623" : "2.5px solid transparent",
                      }}
                    >
                      {url ? (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ fontSize: 32 }}>{emoji}</span>
                      )}
                    </button>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - photos.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="rounded-xl flex-1"
                      style={{
                        height: 80,
                        backgroundColor: bg,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)",
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Right: details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black" style={{ color: "#3D2B1F" }}>{pet.name}</h1>
                    <span className="text-xl" style={{ color: "#9B8778" }}>
                      {pet.gender === "female" ? "♀" : "♂"}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}
                  >
                    {pet.status === "available" ? "Available" : pet.status}
                  </span>
                </div>

                <p className="text-sm mb-5 flex items-center gap-1" style={{ color: "#9B8778" }}>
                  📍 {area}
                </p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Age", value: age },
                    { label: "Breed", value: pet.breed ?? "—" },
                    { label: "Gender", value: pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : "—" },
                    { label: "Neutered", value: pet.neutered ? "Yes" : "No" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                    >
                      <p className="text-xs mb-1" style={{ color: "#9B8778" }}>{s.label}</p>
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {pet.personality?.length > 0 && (
                  <div className="mb-5">
                    <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>Personality</h3>
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

                {pet.description && (
                  <div className="mb-5">
                    <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>About {pet.name}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{pet.description}</p>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-black mb-2" style={{ color: "#3D2B1F" }}>Health</h3>
                  <div className="flex gap-3">
                    <div
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                      style={{ backgroundColor: pet.vaccinated ? "#DCFCE7" : "#F5F2EE", color: pet.vaccinated ? "#16A34A" : "#9B8778" }}
                    >
                      {pet.vaccinated ? "✅" : "❌"} Vaccinated
                    </div>
                    <div
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                      style={{ backgroundColor: pet.neutered ? "#DCFCE7" : "#F5F2EE", color: pet.neutered ? "#16A34A" : "#9B8778" }}
                    >
                      {pet.neutered ? "✅" : "❌"} Neutered
                    </div>
                  </div>
                </div>

                {shelter && (
                  <div
                    className="flex items-center gap-3 p-4 rounded-2xl mb-6"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: "#FFF3E0" }}
                    >
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>
                        {shelter.name || shelter.shelterName || shelter.displayName || "Owner"}
                      </p>
                      <p className="text-xs" style={{ color: "#9B8778" }}>
                        {shelter.role === "shelter" ? "Verified shelter" : "Rehoming owner"}
                      </p>
                    </div>
                    <button
                      className="text-sm font-bold px-4 py-2 rounded-xl"
                      style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52" }}
                    >
                      View
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/adopt-intro/${pet.id}/${encodeURIComponent(pet.name)}`)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                    style={{ backgroundColor: "#F5A623" }}
                  >
                    🤍 Apply to adopt {pet.name}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}