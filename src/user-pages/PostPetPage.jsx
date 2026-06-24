import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import LocationPickerModal from "../components/LocationPickerModal";
import { useEffect } from "react";

const SPECIES = [
  { label: "Cat", emoji: "🐱" },
  { label: "Dog", emoji: "🐶" },
  { label: "Rabbit", emoji: "🐰" },
  { label: "Bird", emoji: "🦜" },
  { label: "Other", emoji: "🐾" },
];

const PERSONALITIES = [
  "Playful", "Cuddly", "Calm", "Curious", "Shy",
  "Vocal", "Energetic", "Affectionate", "Independent",
];

const BREEDS = {
  Cat: ["Local Shorthair", "Persian", "Maine Coon", "Siamese", "Ragdoll", "British Shorthair", "Mixed", "Other"],
  Dog: ["Local Mixed", "Golden Retriever", "Labrador", "Poodle", "Shih Tzu", "Corgi", "Husky", "Mixed", "Other"],
  Rabbit: ["Holland Lop", "Lionhead", "Rex", "Dutch", "Angora", "Mixed", "Other"],
  Bird: ["Budgerigar", "Cockatiel", "Lovebird", "Myna", "Parrot", "Other"],
  Other: ["Other"],
};

export default function PostPetPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [photos, setPhotos] = useState([null, null, null, null, null]);
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null, null]);
  const [species, setSpecies] = useState("Cat");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [ageYears, setAgeYears] = useState("0");
  const [ageMonths, setAgeMonths] = useState("0");
  const [gender, setGender] = useState("");
  const [vaccinated, setVaccinated] = useState(false);
  const [neutered, setNeutered] = useState(false);
  const [personality, setPersonality] = useState([]);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationCoords({ latitude, longitude });
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyDYEK48KaSSeyA50dd_-WEKR5lGrriGlKs`
          );
          const data = await res.json();
          if (data.results?.[0]) {
            setAddress(data.results[0].formatted_address);
          }
        } catch {
          setLocationError("Could not get address. Please type it manually.");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setLocationError("Location access denied. Please type your address manually.");
        setDetectingLocation(false);
      }
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handlePhotoChange = (index, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newPhotos = [...photos];
    const newFiles = [...photoFiles];
    newPhotos[index] = url;
    newFiles[index] = file;
    setPhotos(newPhotos);
    setPhotoFiles(newFiles);
  };

  const togglePersonality = (trait) => {
    setPersonality((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleSubmit = async (status = "available") => {
    if (!name.trim()) { setError("Please enter a pet name."); return; }
    if (!breed.trim()) { setError("Please enter a breed."); return; }
    if (!gender) { setError("Please select a gender."); return; }
    if (!address.trim()) { setError("Please enter a location."); return; }

    setError("");
    setSubmitting(true);

    try {
      // Upload photos
      const photoUrls = [];
      for (const file of photoFiles) {
        if (!file) continue;
        const storageRef = ref(storage, `pet_photos/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }

      await addDoc(collection(db, "pets"), {
        name: name.trim(),
        species: species.toLowerCase(),
        breed: breed.trim(),
        ageYears: parseInt(ageYears) || 0,
        ageMonths: parseInt(ageMonths) || 0,
        gender,
        vaccinated,
        neutered,
        personality,
        description: description.trim(),
        address: address.trim(),
        location: locationCoords ? { latitude: locationCoords.latitude, longitude: locationCoords.longitude } : null,
        photoUrls,
        ownerId: user.uid,
        status,
        createdAt: serverTimestamp(),
      });

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1 text-sm font-semibold mb-1"
                  style={{ color: "#6B5E52" }}
                >
                  ‹ Back
                </button>
                <h1 className="text-2xl font-black" style={{ color: "#3D2B1F" }}>Post a pet for adoption</h1>
                <p className="text-xs mt-0.5" style={{ color: "#9B8778" }}>Listing will be visible to adopters once published.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit("draft")}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                >
                  Save draft
                </button>
                <button
                  onClick={() => handleSubmit("available")}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition"
                  style={{ backgroundColor: submitting ? "#F8C97A" : "#F5A623" }}
                >
                  {submitting ? "Posting..." : "Post for adoption"}
                </button>
              </div>
            </div>

            {error && (
              <div className="max-w-4xl mb-4 px-4 py-3 rounded-xl text-sm text-red-600" style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA" }}>
                {error}
              </div>
            )}

            <div className="flex gap-6 max-w-5xl">
              {/* Left column */}
              <div className="flex-1 space-y-5">

                {/* Photos */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-4" style={{ color: "#3D2B1F" }}>Photos</p>
                  <div className="flex gap-3">
                    {/* Main photo */}
                    <label className="cursor-pointer relative rounded-xl overflow-hidden flex items-center justify-center flex-col gap-2"
                      style={{ width: 180, height: 180, backgroundColor: "#F5F2EE", border: "1.5px dashed #D1C9C0", backgroundImage: photos[0] ? "none" : "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(180,160,130,0.08) 8px, rgba(180,160,130,0.08) 16px)" }}>
                      {photos[0] ? (
                        <img src={photos[0]} className="w-full h-full object-cover" alt="main" />
                      ) : (
                        <>
                          <span className="text-2xl" style={{ color: "#B0A090" }}>📷</span>
                          <span className="text-xs font-semibold" style={{ color: "#B0A090" }}>Main photo</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(0, e.target.files[0])} />
                    </label>

                    {/* Other photos */}
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <label key={i} className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ width: 82, height: 82, backgroundColor: "#F5F2EE", border: "1.5px dashed #D1C9C0" }}>
                          {photos[i] ? (
                            <img src={photos[i]} className="w-full h-full object-cover" alt={`photo ${i}`} />
                          ) : (
                            <span className="text-xl" style={{ color: "#B0A090" }}>+</span>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(i, e.target.files[0])} />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Basic info */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-4" style={{ color: "#3D2B1F" }}>Basic info</p>

                  {/* Species */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#6B5E52" }}>Species</label>
                    <div className="flex gap-2 flex-wrap">
                      {SPECIES.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { setSpecies(s.label); setBreed(""); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition"
                          style={{
                            backgroundColor: species === s.label ? "#FFF3E0" : "#F5F2EE",
                            border: species === s.label ? "1.5px solid #F5A623" : "1.5px solid transparent",
                            color: species === s.label ? "#F5A623" : "#6B5E52",
                          }}
                        >
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Comel"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif" }}
                    />
                  </div>

                  {/* Breed */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Breed</label>
                    <select
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif", color: breed ? "#3D2B1F" : "#9B8778" }}
                    >
                      <option value="">e.g. Local Shorthair</option>
                      {(BREEDS[species] || BREEDS.Other).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Age</label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="number" min="0" max="30"
                          value={ageYears}
                          onChange={(e) => setAgeYears(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-14"
                          style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif" }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "#9B8778" }}>years</span>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number" min="0" max="11"
                          value={ageMonths}
                          onChange={(e) => setAgeMonths(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-16"
                          style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif" }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "#9B8778" }}>months</span>
                      </div>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#6B5E52" }}>Gender</label>
                    <div className="flex gap-3">
                      {["male", "female"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition"
                          style={{
                            backgroundColor: gender === g ? "#FFF3E0" : "#F5F2EE",
                            border: gender === g ? "1.5px solid #F5A623" : "1.5px solid transparent",
                            color: gender === g ? "#F5A623" : "#6B5E52",
                          }}
                        >
                          {g === "male" ? "♂ Male" : "♀ Female"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Location</label>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition"
                      style={{
                        border: address ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                        backgroundColor: "#FAFAFA",
                        fontFamily: "'Nunito', sans-serif",
                        color: address ? "#3D2B1F" : "#9B8778",
                      }}
                    >
                      <span style={{ color: "#F5A623" }}>📍</span>
                      <span className="flex-1 truncate">{address || "Tap to pick location on map"}</span>
                      {address && <span className="text-xs shrink-0" style={{ color: "#F5A623" }}>Change</span>}
                    </button>
                    <p className="text-xs mt-1" style={{ color: "#9B8778" }}>Adopters see this area when browsing nearby pets.</p>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="w-80 space-y-5">

                {/* Health */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-4" style={{ color: "#3D2B1F" }}>Health</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setVaccinated(!vaccinated)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                      style={{
                        backgroundColor: vaccinated ? "#DCFCE7" : "#F5F2EE",
                        color: vaccinated ? "#16A34A" : "#9B8778",
                        border: vaccinated ? "1.5px solid #86EFAC" : "1.5px solid transparent",
                      }}
                    >
                      {vaccinated ? "✓" : "×"} Vaccinated
                    </button>
                    <button
                      onClick={() => setNeutered(!neutered)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                      style={{
                        backgroundColor: neutered ? "#DCFCE7" : "#F5F2EE",
                        color: neutered ? "#16A34A" : "#9B8778",
                        border: neutered ? "1.5px solid #86EFAC" : "1.5px solid transparent",
                      }}
                    >
                      {neutered ? "✓" : "×"} Neutered
                    </button>
                  </div>
                </div>

                {/* Personality */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>Personality</p>
                  <p className="text-xs mb-3" style={{ color: "#9B8778" }}>Used by AI to generate screening questions.</p>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITIES.map((trait) => (
                      <button
                        key={trait}
                        onClick={() => togglePersonality(trait)}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold transition"
                        style={{
                          backgroundColor: personality.includes(trait) ? "#F5A623" : "#F5F2EE",
                          color: personality.includes(trait) ? "white" : "#6B5E52",
                          border: personality.includes(trait) ? "1.5px solid #F5A623" : "1.5px solid transparent",
                        }}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>

                {/* About */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <p className="font-black mb-3" style={{ color: "#3D2B1F" }}>About your pet</p>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Tako is a sweet kitten rescued from Bandar Hilir. Litter-trained and loves chasing toy mice."
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{
                      border: "1.5px solid #EEE8E0",
                      backgroundColor: "#FAFAFA",
                      fontFamily: "'Nunito', sans-serif",
                      color: "#3D2B1F",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Location picker modal */}
      {showMapModal && (
        <LocationPickerModal
          onConfirm={({ address, coords }) => {
            setAddress(address);
            setLocationCoords(coords);
            setShowMapModal(false);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}