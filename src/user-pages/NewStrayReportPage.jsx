import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, storage } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import LocationPickerModal from "../components/LocationPickerModal";

const MAPS_API_KEY = "AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8";
const ANIMAL_TYPES = [
  { label: "Dog", emoji: "🐶" },
  { label: "Cat", emoji: "🐱" },
  { label: "Rabbit", emoji: "🐰" },
  { label: "Bird", emoji: "🦜" },
  { label: "Other", emoji: "🐾" },
];

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks = [];

function loadMapsScript(callback) {
  if (mapsLoaded) { callback(); return; }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
  mapsLoading = true;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&v=weekly`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    mapsLoaded = true;
    mapsLoading = false;
    mapsCallbacks.forEach((cb) => cb());
    mapsCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

export default function NewStrayReportPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFile2, setPhotoFile2] = useState(null);
  const [animalType, setAnimalType] = useState("Cat");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserName(u?.displayName || "");
    });
    return () => unsub();
  }, []);

  const reverseGeocode = async (lat, lng) => {
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
  };

  const initMap = (lat, lng) => {
    if (!mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
    });
    marker.addListener("dragend", (e) => {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setCoords({ latitude: newLat, longitude: newLng });
      reverseGeocode(newLat, newLng);
    });
    map.addListener("click", (e) => {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      marker.setPosition({ lat: newLat, lng: newLng });
      setCoords({ latitude: newLat, longitude: newLng });
      reverseGeocode(newLat, newLng);
    });
    markerRef.current = marker;
    setCoords({ latitude: lat, longitude: lng });
    reverseGeocode(lat, lng);
    setMapLoading(false);
  };

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
        () => {
          setCoords({ latitude: 2.2261, longitude: 102.3285 });
          setAddress("Melaka, Malaysia");
        },
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
    if (!description.trim()) { setError("Please describe the animal."); return; }
    if (!coords) { setError("Location is required."); return; }
    setError("");
    setSubmitting(true);
    try {
      const photoUrls = [];
      for (const file of [photoFile, photoFile2]) {
        if (!file) continue;
        const storageRef = ref(storage, `stray_photos/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }
      await addDoc(collection(db, "stray_reports"), {
        title: `${animalType} spotted`,
        species: animalType.toLowerCase(),
        description: description.trim(),
        address,
        location: coords,
        photoUrls,
        urgent,
        status: "open",
        reporterId: user.uid,
        createdAt: serverTimestamp(),
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
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Report a stray animal</h1>
            <p className="text-sm mb-6" style={{ color: "#9B8778" }}>The nearest shelter will be alerted to respond.</p>

            {/* Photo */}
            <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>Photo</p>
              <p className="text-xs mb-3" style={{ color: "#9B8778" }}>First photo is required. Second is optional.</p>
              <div className="flex gap-3">
                {/* Main photo - required */}
                <label className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center flex-col gap-2 relative"
                  style={{
                    width: 280, height: 180, flexShrink: 0,
                    backgroundColor: "#F5EFE6",
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(180,150,100,0.07) 10px, rgba(180,150,100,0.07) 20px)",
                    border: "1.5px dashed #D1C9C0",
                  }}>
                  {photo ? (
                    <img src={photo} alt="main" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-2xl" style={{ color: "#B0A090" }}>📷</span>
                      <span className="text-xs font-semibold" style={{ color: "#B0A090" }}>Main photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(0, e.target.files[0])} />
                </label>

                {/* Second photo - optional */}
                <label className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center flex-col gap-2"
                  style={{
                    width: 180, height: 180, flexShrink: 0,
                    backgroundColor: "#F5EFE6",
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(180,150,100,0.07) 10px, rgba(180,150,100,0.07) 20px)",
                    border: "1.5px dashed #D1C9C0",
                  }}>
                  {photo2 ? (
                    <img src={photo2} alt="extra" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-xl" style={{ color: "#B0A090" }}>+</span>
                      <span className="text-xs font-semibold" style={{ color: "#B0A090" }}>Optional</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(1, e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Location + Animal details side by side */}
            <div className="flex gap-4 mb-4">
              {/* Location */}
              <div className="rounded-2xl p-5 flex-1" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="font-black mb-3 flex items-center gap-2" style={{ color: "#3D2B1F" }}>
                  <span style={{ color: "#F5A623" }}>📍</span> Location (auto-detected)
                </p>
                {/* Static map preview — click to open modal */}
                <div
                  onClick={() => setShowMapModal(true)}
                  className="rounded-xl overflow-hidden cursor-pointer mb-3 relative"
                  style={{ height: 180 }}
                >
                  {coords ? (
                    <img
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.latitude},${coords.longitude}&zoom=16&size=600x300&markers=color:red%7C${coords.latitude},${coords.longitude}&key=AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8`}
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
                  Detected from your device. Drag the pin if the animal moved from where you spotted it.
                </p>
              </div>

              {/* Animal details */}
              <div className="rounded-2xl p-5 flex-1" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <p className="font-black mb-4" style={{ color: "#3D2B1F" }}>Animal details</p>

                {/* Animal type */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#6B5E52" }}>Animal type</label>
                  <div className="flex gap-2 flex-wrap">
                    {ANIMAL_TYPES.map((t) => (
                      <button key={t.label} onClick={() => setAnimalType(t.label)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition"
                        style={{
                          backgroundColor: animalType === t.label ? "#FFF3E0" : "#F5F2EE",
                          border: animalType === t.label ? "1.5px solid #F5A623" : "1.5px solid transparent",
                          color: animalType === t.label ? "#F5A623" : "#6B5E52",
                        }}>
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Description</label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Colour, condition, behaviour, any injuries..."
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                    style={{ border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA", fontFamily: "'Nunito', sans-serif", color: "#3D2B1F" }}
                  />
                </div>
              </div>
            </div>

            {/* Urgent toggle */}
            <div
              className="flex items-center justify-between px-5 py-4 rounded-2xl mb-6"
              style={{ backgroundColor: urgent ? "#FEE2E2" : "white", border: `1px solid ${urgent ? "#FECACA" : "#EEE8E0"}` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>Urgent — animal is injured</p>
                  <p className="text-xs" style={{ color: "#9B8778" }}>The shelter will be alerted immediately.</p>
                </div>
              </div>
              <button
                onClick={() => setUrgent(!urgent)}
                className="relative inline-flex items-center shrink-0"
                style={{ width: 48, height: 28 }}
              >
                <div className="w-full h-full rounded-full transition-colors"
                  style={{ backgroundColor: urgent ? "#EF4444" : "#D1C9C0" }} />
                <div className="absolute top-1 transition-all rounded-full bg-white"
                  style={{ width: 20, height: 20, left: urgent ? 24 : 4, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button onClick={() => navigate("/reports")}
                className="px-6 py-3 rounded-xl text-sm font-bold transition"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: submitting ? "#F8C97A" : "#F5A623" }}>
                {submitting ? "Sending..." : "Send report"}
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