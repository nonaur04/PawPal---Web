import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import PetCard from "../components/PetCard";

const SPECIES_TABS = [
  { label: "All", emoji: "🐾" },
  { label: "Dogs", emoji: "🐶", key: "dog" },
  { label: "Cats", emoji: "🐱", key: "cat" },
  { label: "Rabbits", emoji: "🐰", key: "rabbit" },
  { label: "Birds", emoji: "🦜", key: "bird" },
  { label: "Others", emoji: "🐾", key: "others" },
];

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PAGE_CONFIG = {
  nearby: {
    title: "Pets Near You",
    subtitle: "Available pets within 30 km of your location",
  },
  preference: {
    title: "Based on Your Preference",
    subtitle: "Cats that match your saved preferences",
  },
  default: {
    title: "Browse all pets",
    subtitle: "Pets near Melaka from verified shelters and rehoming owners",
  },
};

export default function BrowseAllPetsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const browseType = searchParams.get("type") ?? "default";

  const [allPets, setAllPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSpecies, setActiveSpecies] = useState("All");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [userName, setUserName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUserName(u.displayName || "");
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const fetchPets = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "pets"));
        let pets = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.status === "available" && p.ownerId !== currentUser?.uid)
          .map((p) => {
            let distanceKm = null;
            if (userLocation && p.location) {
              const lat = p.location.latitude ?? p.location._lat;
              const lng = p.location.longitude ?? p.location._long;
              distanceKm = haversineKm(userLocation.lat, userLocation.lng, lat, lng);
            }
            return { ...p, distanceKm };
          });

        // Filter by type
        if (browseType === "nearby") {
          pets = pets
            .filter((p) => p.distanceKm == null || p.distanceKm <= 30)
            .sort((a, b) => {
              if (a.distanceKm == null) return 1;
              if (b.distanceKm == null) return -1;
              return a.distanceKm - b.distanceKm;
            });
        } else if (browseType === "preference") {
          pets = pets.filter((p) => p.species?.toLowerCase() === "cat");
        } else {
          pets = pets.sort((a, b) => {
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
          });
        }

        setAllPets(pets);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, [userLocation, browseType, currentUser]);

  const config = PAGE_CONFIG[browseType] ?? PAGE_CONFIG.default;

  // Count per species from current pets list
  const counts = SPECIES_TABS.reduce((acc, tab) => {
    if (tab.label === "All") {
      acc["All"] = allPets.length;
    } else {
      acc[tab.label] = allPets.filter((p) => p.species?.toLowerCase() === tab.key).length;
    }
    return acc;
  }, {});

  // Apply species + search filter
  const filtered = allPets
    .filter((p) => {
      if (activeSpecies === "All") return true;
      const tab = SPECIES_TABS.find((t) => t.label === activeSpecies);
      return p.species?.toLowerCase() === tab?.key;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.breed?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
      );
    });

  const toCardPet = (p) => ({
    id: p.id,
    name: p.name,
    breed: p.breed,
    age: formatAge(p.ageYears, p.ageMonths),
    gender: p.gender,
    distance: p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km` : null,
    area: p.address?.split(",")[1]?.trim() ?? p.address?.split(",")[0]?.trim() ?? "",
    vaccinated: p.vaccinated,
    photoUrl: p.photoUrls?.[0] ?? null,
    bg: SPECIES_BG[p.species?.toLowerCase()] ?? "#F9BFBF",
    emoji: SPECIES_EMOJI[p.species?.toLowerCase()] ?? "🐾",
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to discover
          </button>

          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>{config.title}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#9B8778" }}>{config.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ backgroundColor: "white", border: "1px solid #EEE8E0", width: 260 }}>
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, breed, area"
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-300"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
            </div>
          </div>

          {/* Species tabs — hidden for preference type since it's already filtered to cats */}
          {browseType !== "preference" && (
            <div className="flex gap-2 flex-wrap mb-4 mt-4">
              {SPECIES_TABS.map((tab) => {
                const isActive = activeSpecies === tab.label;
                return (
                  <button
                    key={tab.label}
                    onClick={() => setActiveSpecies(tab.label)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition"
                    style={{
                      backgroundColor: isActive ? "#FFF3E0" : "white",
                      border: isActive ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                      color: isActive ? "#F5A623" : "#6B5E52",
                    }}
                  >
                    <span>{tab.emoji}</span>
                    {tab.label}
                    <span className="ml-0.5 text-xs font-bold" style={{ color: isActive ? "#F5A623" : "#9B8778" }}>
                      {counts[tab.label] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-sm font-semibold mb-4" style={{ color: "#9B8778" }}>
            {filtered.length} pet{filtered.length !== 1 ? "s" : ""} available
          </p>

          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ height: 260, backgroundColor: "white" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-3">🐾</p>
              <p className="font-black text-lg mb-1" style={{ color: "#3D2B1F" }}>No pets found</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>Try a different filter or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((p) => (
                <PetCard key={p.id} pet={toCardPet(p)} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}