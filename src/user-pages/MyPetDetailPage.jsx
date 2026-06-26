import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = {
  dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0",
  bird: "#C4E0F2", others: "#D4F2C4",
};
const SPECIES_EMOJI = {
  dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾",
};

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo${months !== 1 ? "s" : ""}`;
}

export default function MyPetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicantCount, setApplicantCount] = useState(0);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const petDoc = await getDoc(doc(db, "pets", id));
        if (!petDoc.exists()) return;
        setPet({ id: petDoc.id, ...petDoc.data() });

        // Count applications
        const appSnap = await getDocs(query(collection(db, "applications"), where("petId", "==", id)));
        setApplicantCount(appSnap.size);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleMarkAdopted = async () => {
    setMarking(true);
    try {
      await updateDoc(doc(db, "pets", id), { status: "adopted" });
      setPet((prev) => ({ ...prev, status: "adopted" }));
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

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
  const age = formatAge(pet.ageYears, pet.ageMonths);
  const area = pet.address?.split(",").slice(0, 2).join(",").trim() ?? pet.address ?? "";
  const photo = pet.photoUrls?.[0] ?? null;
  const isAdopted = pet.status === "adopted";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            {/* Back */}
            <button
              onClick={() => navigate("/home")}
              className="flex items-center gap-1 text-sm font-semibold mb-4"
              style={{ color: "#6B5E52" }}
            >
              ‹ Back to my listings
            </button>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black" style={{ color: "#3D2B1F" }}>{pet.name}</h1>
                  <span className="text-lg" style={{ color: "#9B8778" }}>{pet.gender === "female" ? "♀" : "♂"}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: isAdopted ? "#F5F2EE" : "#DCFCE7", color: isAdopted ? "#9B8778" : "#16A34A" }}>
                    {isAdopted ? "Adopted" : "Available"}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>
                    Your listing
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#9B8778" }}>
                  {pet.breed} · {age} · {area}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/review-applicant/${id}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ backgroundColor: "white", border: "1.5px solid #EEE8E0", color: "#6B5E52" }}
                >
                  📋 {applicantCount} applicants
                </button>
                <button
                  onClick={() => navigate(`/edit-pet/${id}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                  style={{ backgroundColor: "#F5A623" }}
                >
                  ✏️ Edit listing
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex gap-6">

              {/* Left */}
              <div className="flex flex-col gap-4" style={{ width: 440 }}>
                {/* Main photo */}
                <div
                  className="rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    height: 380,
                    backgroundColor: bg,
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.18) 10px, rgba(255,255,255,0.18) 20px)",
                  }}
                >
                  {photo
                    ? <img src={photo} alt={pet.name} className="w-full h-full object-cover" />
                    : <span style={{ fontSize: 100 }}>{emoji}</span>
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
                      { icon: "🐾", value: applicantCount, label: "Applicants" },
                      { icon: "👀", value: pet.views ?? 0, label: "Views" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-4 text-center"
                        style={{ backgroundColor: "#F5F2EE" }}
                      >
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
                    { label: "Species", value: pet.species ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1) : "—" },
                    { label: "Breed", value: pet.breed ?? "—" },
                    { label: "Age", value: age },
                    { label: "Gender", value: pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : "—" },
                    { label: "Location", value: area || "—" },
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

                {/* Mark adopted */}
                {!isAdopted && (
                  <div
                    className="rounded-2xl p-5 flex items-center justify-between"
                    style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
                  >
                    <div>
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>Found {pet.name} a home?</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>Mark as adopted to close the listing.</p>
                    </div>
                    <button
                      onClick={handleMarkAdopted}
                      disabled={marking}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold transition"
                      style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                    >
                      {marking ? "Saving..." : "Mark adopted"}
                    </button>
                  </div>
                )}

                {isAdopted && (
                  <div
                    className="rounded-2xl p-5 flex items-center gap-3"
                    style={{ backgroundColor: "#DCFCE7", border: "1px solid #86EFAC" }}
                  >
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="font-black text-sm" style={{ color: "#16A34A" }}>{pet.name} has found a home!</p>
                      <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>This listing is now closed.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
           </div> 
        </main>
      </div>
    </div>
  );
}