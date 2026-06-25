import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import HeroBanner from "../components/HeroBanner";
import SpeciesFilter from "../components/SpeciesFilter";
import PetSection from "../components/PetSection";
import YourListings from "../components/YourListings";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo${months !== 1 ? "s" : ""}`;
}

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

// Maps onboarding pet-type keys (plural) -> pet doc species value (singular)
const PET_TYPE_TO_SPECIES = {
  dogs: "dog",
  cats: "cat",
  rabbits: "rabbit",
  birds: "bird",
  others: "others",
};

// Human-readable label for subtitle text
const SPECIES_LABEL = {
  dog: "Dogs",
  cat: "Cats",
  rabbit: "Rabbits",
  bird: "Birds",
  others: "Other pets",
};

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("there");
  const [activeSpecies, setActiveSpecies] = useState("All");
  const [allPets, setAllPets] = useState([]);
  const [userPets, setUserPets] = useState([]);
  const [applicantCounts, setApplicantCounts] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    petTypePreferences: [],
    breedPreferences: {},
  });

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name || data.fullName || data.displayName || firebaseUser.displayName || "there");
          setPreferences({
            petTypePreferences: data.petTypePreferences || [],
            breedPreferences: data.breedPreferences || {},
          });
        }
      }
    });
    return () => unsub();
  }, []);

  // Get user GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  // Fetch pets from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchPets = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "pets"));
        const pets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Filter by status available and split by owner
        const available = pets.filter((p) => p.status === "available");
        const others = available.filter((p) => p.ownerId !== user.uid);
        const mine = pets.filter((p) => p.ownerId === user.uid);

        // Attach distance if we have location
        const withDistance = others.map((p) => {
          let distanceKm = null;
          if (userLocation && p.location) {
            const lat = p.location.latitude ?? p.location._lat;
            const lng = p.location.longitude ?? p.location._long;
            distanceKm = haversineKm(userLocation.lat, userLocation.lng, lat, lng);
          }
          return { ...p, distanceKm };
        });

        // Sort by distance if available
        withDistance.sort((a, b) => {
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });

        setAllPets(withDistance);
        setUserPets(mine);

        // Fetch real applicant counts
        const appsSnap = await getDocs(collection(db, "applications"));
        const allApps = appsSnap.docs.map((d) => d.data());
        setApplicantCounts(
          mine.reduce((acc, p) => {
            acc[p.id] = allApps.filter((a) => a.petId === p.id).length;
            return acc;
          }, {})
        );
      } catch (err) {
        console.error("Failed to fetch pets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, [user, userLocation]);

  // Filter by species (top filter bar)
  const filtered = activeSpecies === "All"
    ? allPets
    : allPets.filter((p) => p.species?.toLowerCase() === activeSpecies.toLowerCase().replace(/s$/, ""));

  // Nearby = within 30km (or all if no location)
  const nearby = filtered.filter((p) => p.distanceKm == null || p.distanceKm <= 30).slice(0, 8);

  // ---- Based on your preference ----
  const { petTypePreferences, breedPreferences } = preferences;

  // Resolve which species the user actually wants (singular form), excluding "any"
  const preferredSpecies = (petTypePreferences || [])
    .filter((t) => t !== "any")
    .map((t) => PET_TYPE_TO_SPECIES[t])
    .filter(Boolean);

  const wantsAny = !petTypePreferences?.length || petTypePreferences.includes("any");

  let preference = [];
  let preferenceSubtitle = "Pets that match your saved preferences";

  if (wantsAny) {
    // No specific preference saved (or chose "Any") — fall back to showing a general mix
    preference = allPets.slice(0, 8);
    preferenceSubtitle = "A mix of pets you might like";
  } else {
    preference = allPets.filter((p) => {
      const species = p.species?.toLowerCase();
      if (!preferredSpecies.includes(species)) return false;

      // Find which onboarding type key maps to this species, to look up breed prefs
      const typeKey = Object.keys(PET_TYPE_TO_SPECIES).find(
        (key) => PET_TYPE_TO_SPECIES[key] === species
      );
      const breedPrefs = breedPreferences?.[typeKey];

      // No breed preference saved for this type, or user picked "Any"/"Mixed" -> show all breeds
      if (!breedPrefs || breedPrefs.length === 0) return true;
      if (breedPrefs.includes("Any") || breedPrefs.includes("Mixed")) return true;

      // Otherwise only show pets whose breed matches one of the selected breeds
      return breedPrefs.some(
        (b) => b.toLowerCase() === (p.breed || "").toLowerCase()
      );
    }).slice(0, 8);

    const labels = preferredSpecies.map((s) => SPECIES_LABEL[s] || s).join(" & ");
    preferenceSubtitle = `${labels} that match your saved preferences`;
  }

  // Map pet doc to card-ready shape
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

  const toListingPet = (p) => ({
    id: p.id,
    name: p.name,
    age: formatAge(p.ageYears, p.ageMonths),
    gender: p.gender,
    status: p.status === "available" ? "Available" : p.status,
    applicants: applicantCounts[p.id] ?? 0,
    photoUrl: p.photoUrls?.[0] ?? null,
    bg: SPECIES_BG[p.species?.toLowerCase()] ?? "#F9BFBF",
    emoji: SPECIES_EMOJI[p.species?.toLowerCase()] ?? "🐾",
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <HeroBanner name={userName.split(" ")[0]} />
            <SpeciesFilter active={activeSpecies} onSelect={setActiveSpecies} />
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm" style={{ color: "#9B8778" }}>Loading pets...</p>
              </div>
            ) : (
              <>
                <PetSection
                  title="Pets Near You"
                  subtitle="Within 30 km"
                  pets={nearby.map(toCardPet)}
                  browseType="nearby"
                />
                <PetSection
                  title="Based on your preference"
                  subtitle={preferenceSubtitle}
                  pets={preference.map(toCardPet)}
                  browseType="preference"
                />
                <YourListings listings={userPets.map(toListingPet)} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}