import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import LocationPickerModal from "../components/LocationPickerModal";

const SPECIES = [
  { label: "Dog", emoji: "🐶" },
  { label: "Cat", emoji: "🐱" },
  { label: "Rabbit", emoji: "🐰" },
  { label: "Bird", emoji: "🦜" },
  { label: "Other", emoji: "🐾" },
];

export default function NewLostReportPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFile2, setPhotoFile2] = useState(null);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Cat");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserName(u?.displayName || "");
    });
    return () => unsub();
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ latitude: lat, longitude: lng });
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            if (data.display_name) setAddress(data.display_name);
          } catch {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        },
        () => { setCoords({ latitude: 2.2261, longitude: 102.3285 }); setAddress("Melaka, Malaysia"); },
        { timeout: 8000 }
      );
    } else {
      setCoords({ latitude: 2.2261, longitude: 102.3285 });
      setAddress("Melaka, Malaysia");
    }
  }, []);

  const handlePhotoChange = (index, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (index === 0) { setPhoto(url); setPhotoFile(file); }
    else { setPhoto2(url); setPhotoFile2(file); }
  };

  const handleSubmit = async () => {
    if (!petName.trim()) { setError("Please enter your pet's name."); return; }
    if (!description.trim()) { setError("Please describe your pet."); return; }
    if (!coords) { setError("Location is required."); return; }
    setError("");
    setSubmitting(true);
    try {
      const photoUrls = [];
      for (const file of [photoFile, photoFile2]) {
        if (!file) continue;
        const storageRef = ref(storage, `lost_photos/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }
      await addDoc(collection(db, "lost_found"), {
        type: "lost",
        petName: petName.trim(),
        species: species.toLowerCase(),
        breed: breed.trim(),
        description: description.trim(),
        reward: reward ? parseInt(reward) : null,
        address,
        location: coords,
        photoUrls,
        status: "searching",
        reporterId: user.uid,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
      navigate("/reports");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            <button onClick={() => navigate("/reports")} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>
              ‹ Back to Reports
            </button>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Post a lost pet</h1>
            <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Share details so the community can help find them.</p>

            {/* Photos */}
            <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>Photos of your pet</p>
              <p className="text-xs mb-3" style={{ color: "#9B8778" }}>First photo is required. Second is optional.</p>
              <div className="flex gap-3">
                <label className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center flex-col gap-2"
                  style={{
                    width: 280, height: 180, flexShrink: 0,
                    backgroundColor: "#F5EFE6",
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(180,150,100,0.07) 10px, rgba(180,150,100,0.07) 20px)",
                    border: "1.5px dashed #D1C9C0",
                  }}>
                  {photo
                    ? <img src={photo} alt="main" className="w-full h-full object-cover" />
                    : <><span className="text-2xl" style={{ color: "#B0A090" }}>📷</span><span className="text-xs font-semibold" style={{ color: "#B0A090" }}>Main photo</span></>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(0, e.target.files[0])} />
                </label>

                <label className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center flex-col gap-2"
                  style={{
                    width: 180, height: 180, flexShrink: 0,
                    backgroundColor: "#F5EFE6",
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(180,150,100,0.07) 10px, rgba(180,150,100,0.07) 20px)",
                    border: "1.5px dashed #D1C9C0",
                  }}>
                  {photo2
                    ? <img src={photo2} alt="extra" className="w-full h-full object-cover" />
                    : <><span className="text-xl" style={{ color: "#B0A090" }}>+</span><span className="text-xs font-semibold" style={{ color: "#B0A090" }}>Optional</span></>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(1, e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Map + Pet details */}
            <div className="flex gap-4 mb-4">
              {/* Last seen map */}
              <div className="rounded-2xl p-5 flex-1" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="font-black mb-3 flex items-center gap-2" style={{ color: "#3D2B1F" }}>
                  <span style={{ color: "#F5A623" }}>📍</span> Last seen on map
                </p>
                <div
                  onClick={() => setShowMapModal(true)}
                  className="rounded-xl overflow-hidden cursor-pointer mb-3 relative"
                  style={{ height: 180 }}
                >
                  {coords ? (
                    <img
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.latitude},${coords.longitude}&zoom=16&size=600x300&markers=color:orange%7C${coords.latitude},${coords.longitude}&key=AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8`}
                      alt="map"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#E8F5E9" }}>
                      <p className="text-sm" style={{ color: "#9B8778" }}>Detecting location...</p>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "#6B5E52" }}>
                      Tap to change
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}>
                  <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{address || "Detecting location..."}</p>
                </div>
                <p className="text-xs mt-2" style={{ color: "#9B8778" }}>
                  Drop the pin where your pet was last seen.
                </p>
              </div>

              {/* About your pet */}
              <div className="rounded-2xl p-5 flex-1" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="font-black mb-4" style={{ color: "#3D2B1F" }}>About your pet</p>

                {/* Pet name */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Pet name</label>
                  <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Milo"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif" }} />
                </div>

                {/* Species */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#6B5E52" }}>Species</label>
                  <div className="flex gap-2 flex-wrap">
                    {SPECIES.map((s) => (
                      <button key={s.label} onClick={() => setSpecies(s.label)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition"
                        style={{
                          backgroundColor: species === s.label ? "#FFF3E0" : "#F5F2EE",
                          border: species === s.label ? "1.5px solid #F5A623" : "1.5px solid transparent",
                          color: species === s.label ? "#F5A623" : "#6B5E52",
                        }}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Breed */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Breed / appearance</label>
                  <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Persian, orange tabby"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif" }} />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Description</label>
                  <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Markings, collar, temperament, when they went missing..."
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif", color: "#3D2B1F" }} />
                </div>

                {/* Reward */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Reward (optional)</label>
                  <div className="flex items-center rounded-xl overflow-hidden"
                    style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA" }}>
                    <span className="px-3 text-sm font-semibold shrink-0" style={{ color: "#9B8778" }}>RM</span>
                    <div style={{ width: 1, height: 20, backgroundColor: "#EEE8E0" }} />
                    <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. 100"
                      className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
                      style={{ fontFamily: "'Nunito', sans-serif" }} />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button onClick={() => navigate("/reports")}
                className="px-6 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: submitting ? "#F8C97A" : "#F5A623" }}>
                {submitting ? "Posting..." : "Post lost pet"}
              </button>
            </div>
          </div>  
        </main>
      </div>

      {showMapModal && (
        <LocationPickerModal
          onConfirm={({ address, coords }) => {
            setAddress(address);
            setCoords(coords);
            setShowMapModal(false);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}