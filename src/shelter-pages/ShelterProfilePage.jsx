import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🦜", other: "🐾" };
const STRIPE_BG = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)";

export default function ShelterProfilePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [shelter, setShelter] = useState(null);
  const [availablePets, setAvailablePets] = useState([]);
  const [strayHelpedCount, setStrayHelpedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setShelter(userDoc.data());

      const petsSnap = await getDocs(
        query(collection(db, "pets"), where("ownerId", "==", user.uid))
      );
      const allPets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const available = allPets.filter((p) => (p.status || "").toLowerCase() === "available");
      setAvailablePets(available);

      // Strays helped this month — resolved stray reports assigned to / posted near this shelter
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const straySnap = await getDocs(
        query(collection(db, "stray_reports"), where("assignedTo", "==", user.uid))
      );
      const resolvedThisMonth = straySnap.docs
        .map((d) => d.data())
        .filter((r) => (r.status || "").toLowerCase() === "resolved" && r.createdAt?.toDate?.() >= startOfMonth);
      setStrayHelpedCount(resolvedThisMonth.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-sm" style={{ color: "#9B8778" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  const orgName = shelter?.orgName || "Your Shelter";
  const location = shelter?.location || "Melaka";
  const description = shelter?.description || "Tell adopters about your shelter — add a description in Edit profile.";
  const phone = shelter?.phone || "Not set";
  const email = shelter?.email || "—";
  const website = shelter?.website || null;
  const teamCount = shelter?.teamMembers?.length || shelter?.teamCount || 1;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar orgName={orgName} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ShelterTopBar />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>Shelter Profile</h1>
              <p className="text-sm mt-0.5" style={{ color: "#9B8778" }}>How adopters see your shelter</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/shelter/settings")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center gap-1"
                style={{ backgroundColor: "#F5A623" }}
              >
                ✏️ Edit profile
              </button>
            </div>
          </div>

          {/* Full-width identity card */}
          <div className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
            {/* Banner */}
            <div
              className="h-32"
              style={{ background: "linear-gradient(135deg, #FCD9A8 0%, #FCE8C8 100%)" }}
            />
            <div className="px-6 pb-6">
              {/* Logo */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shrink-0 -mt-10 mb-4 border-4 border-white"
                style={{ backgroundColor: "#F59E0B" }}
              >
                🏠
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>{orgName}</h2>
                <span style={{ color: "#3B82F6" }}>✓</span>
              </div>
              <p className="text-sm mb-4" style={{ color: "#9B8778" }}>
                📍 {location}
              </p>

              <p className="text-sm leading-relaxed mb-5" style={{ color: "#6B5E52" }}>
                {description}
              </p>

              {/* Stats */}
              <div className="flex gap-10 pt-4" style={{ borderTop: "1px solid #F5F2EE" }}>
                <div>
                  <p className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{availablePets.length}</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Available pets</p>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{teamCount}</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Team members</p>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{strayHelpedCount}</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>Strays helped (this mo.)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column split below */}
          <div className="grid grid-cols-3 gap-5">
            {/* Left: Available pets */}
            <div className="col-span-2">
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black" style={{ color: "#3D2B1F" }}>Available pets ({availablePets.length})</h3>
                  <button
                    onClick={() => navigate("/shelter/listings")}
                    className="text-sm font-bold flex items-center gap-1"
                    style={{ color: "#F5A623" }}
                  >
                    Manage →
                  </button>
                </div>

                {availablePets.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "#9B8778" }}>No available pets yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availablePets.map((pet) => {
                      const emoji = SPECIES_EMOJI[(pet.species || "").toLowerCase()] || "🐾";
                      const photo = pet.photoUrls?.[0];
                      return (
                        <div
                          key={pet.id}
                          className="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ border: "1px solid #EEE8E0" }}
                          onClick={() => navigate(`/shelter/listings/${pet.id}`)}
                        >
                          <div
                            className="h-44 flex items-center justify-center"
                            style={{ backgroundColor: "#F9C4B0", backgroundImage: photo ? "none" : STRIPE_BG }}
                          >
                            {photo
                              ? <img src={photo} className="w-full h-full object-cover" alt={pet.name} />
                              : <span style={{ fontSize: 40 }}>{emoji}</span>
                            }
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>{pet.name}</p>
                            <p className="text-xs" style={{ color: "#9B8778" }}>{pet.breed || "—"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Contact */}
            <div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h3 className="font-black mb-3" style={{ color: "#3D2B1F" }}>Contact</h3>
                <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F5F2EE" }}>
                  <p className="text-sm" style={{ color: "#9B8778" }}>Phone</p>
                  <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{phone}</p>
                </div>
                <div className="flex items-center justify-between py-2.5" style={{ borderBottom: website ? "1px solid #F5F2EE" : "none" }}>
                  <p className="text-sm" style={{ color: "#9B8778" }}>Email</p>
                  <p className="text-sm font-semibold text-right break-all" style={{ color: "#3D2B1F" }}>{email}</p>
                </div>
                {website && (
                  <div className="flex items-center justify-between py-2.5">
                    <p className="text-sm" style={{ color: "#9B8778" }}>Website</p>
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold"
                      style={{ color: "#F5A623" }}
                    >
                      {website}
                    </a>
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