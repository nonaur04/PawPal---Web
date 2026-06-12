import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const MAPS_API_KEY = "AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8";

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks = [];

function loadMapsScript(callback) {
  if (mapsLoaded) { callback(); return; }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
  mapsLoading = true;
  if (document.querySelector('script[src*="maps.googleapis.com"]')) {
    mapsLoaded = true;
    mapsLoading = false;
    mapsCallbacks.forEach((cb) => cb());
    mapsCallbacks.length = 0;
    return;
  }
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&v=weekly`;
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

function getOpenStatus(opening_hours) {
  if (!opening_hours) return { open: null, label: "Hours unknown" };
  const isOpen = opening_hours.isOpen?.() ?? opening_hours.open_now;
  const periods = opening_hours.periods;
  let closeTime = null;
  if (periods) {
    const now = new Date();
    const day = now.getDay();
    const period = periods.find((p) => p.open?.day === day);
    if (period?.close?.time) {
      const t = period.close.time;
      const h = parseInt(t.slice(0, 2));
      const m = t.slice(2);
      closeTime = `${h > 12 ? h - 12 : h}:${m}${h >= 12 ? "pm" : "am"}`;
    }
  }
  return {
    open: isOpen,
    label: isOpen ? `Open · closes ${closeTime || "later"}` : `Closed · opens 9am`,
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SPECIES_KEYWORDS = {
  Dogs: ["dog", "canine", "hound"],
  Cats: ["cat", "feline", "kitten"],
  Rabbits: ["rabbit", "bunny", "rodent"],
  Exotic: ["exotic", "reptile", "bird", "avian"],
  "24/7": ["24", "emergency", "24/7"],
};

function inferSpeciesTags(place) {
  const text = [place.name, ...(place.types ?? [])].join(" ").toLowerCase();
  const tags = [];
  if (!text.includes("cat only") && !text.includes("feline only")) tags.push("Dogs");
  tags.push("Cats");
  if (text.includes("rabbit") || text.includes("exotic")) tags.push(text.includes("rabbit") ? "Rabbits" : "Exotic");
  if (place.opening_hours?.periods?.some((p) => p.open?.day === 0 && p.open?.time === "0000")) tags.push("24/7");
  return tags.slice(0, 4);
}

export default function VetNearMePage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVet, setSelectedVet] = useState(null);
  const [areaName, setAreaName] = useState("Melaka");
  const markersRef = useRef([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserName(u?.displayName || ""));
    return () => unsub();
  }, []);

  useEffect(() => {
    loadMapsScript(() => {
      const defaultCoords = { lat: 2.2261, lng: 102.3285 };
      initMapAndSearch(defaultCoords);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            initMapAndSearch(coords);
          },
          () => initMapAndSearch(defaultCoords),
          { timeout: 8000 }
        );
      }
    });
  }, []);

  const initMapAndSearch = (coords) => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: coords,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;

    // User location marker
    new window.google.maps.Marker({
      position: coords,
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4A90D9",
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
      },
    });

    // Reverse geocode for area name
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results) => {
      if (results?.[0]) {
        const component = results[0].address_components?.find((c) => c.types.includes("sublocality") || c.types.includes("locality"));
        if (component) setAreaName(component.long_name);
      }
    });

    // Places nearby search
    const service = new window.google.maps.places.PlacesService(map);
    service.nearbySearch(
      { location: coords, radius: 50000, keyword: "veterinary clinic vet animal hospital" },
      (results, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
          setLoading(false);
          return;
        }

        // Clear old markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const vetList = results.slice(0, 10).map((place) => {
          const distKm = haversineKm(coords.lat, coords.lng, place.geometry.location.lat(), place.geometry.location.lng());
          return { ...place, distKm };
        }).sort((a, b) => a.distKm - b.distKm);

        // Get details for open status
        const detailPromises = vetList.map((place) =>
          new Promise((resolve) => {
            service.getDetails(
              { placeId: place.place_id, fields: ["opening_hours", "formatted_phone_number", "website"] },
              (details) => resolve({ ...place, ...(details || {}) })
            );
          })
        );

        Promise.all(detailPromises).then((detailed) => {
          setVets(detailed);
          setLoading(false);

          // Add markers
          detailed.forEach((vet, i) => {
            const marker = new window.google.maps.Marker({
              position: vet.geometry.location,
              map,
              icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#F5A623" stroke="white" stroke-width="2"/>
                    <text x="20" y="26" text-anchor="middle" font-size="18">🩺</text>
                  </svg>`)}`,
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
              },
            });
            marker.addListener("click", () => {
              setSelectedVet(vet.place_id);
              document.getElementById(`vet-${vet.place_id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            markersRef.current.push(marker);
          });
        });
      }
    );
  };

  const openDirections = (vet) => {
    const lat = vet.geometry.location.lat();
    const lng = vet.geometry.location.lng();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  const callVet = (vet) => {
    if (vet.formatted_phone_number) {
      window.open(`tel:${vet.formatted_phone_number}`);
    } else {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(vet.name + " phone number")}`, "_blank");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          <div className="mb-5">
            <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#3D2B1F" }}>
              Vet Near Me <span>🩺</span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#9B8778" }}>
              Trusted clinics near {areaName}
            </p>
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden mb-6" style={{ height: 280, border: "1px solid #EEE8E0" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Vet cards */}
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ height: 180, backgroundColor: "white" }} />
              ))}
            </div>
          ) : vets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-3xl mb-3">🏥</p>
              <p className="font-black mb-1" style={{ color: "#3D2B1F" }}>No vets found nearby</p>
              <p className="text-sm" style={{ color: "#9B8778" }}>Try allowing location access</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {vets.map((vet) => {
                const { open, label } = getOpenStatus(vet.opening_hours);
                const tags = inferSpeciesTags(vet);
                const is24 = tags.includes("24/7");
                const isSelected = selectedVet === vet.place_id;

                return (
                  <div
                    id={`vet-${vet.place_id}`}
                    key={vet.place_id}
                    onClick={() => {
                      setSelectedVet(vet.place_id);
                      mapInstanceRef.current?.panTo(vet.geometry.location);
                    }}
                    className="rounded-2xl p-5 cursor-pointer transition"
                    style={{
                      backgroundColor: "white",
                      border: isSelected ? "2px solid #F5A623" : "1px solid #EEE8E0",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: "#FFF3E0" }}>
                        🩺
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{vet.name}</p>
                          {is24 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}>24/7</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#9B8778" }}>
                          {vet.rating && (
                            <span className="flex items-center gap-0.5">
                              <span style={{ color: "#F5A623" }}>★</span>
                              <span className="font-bold" style={{ color: "#3D2B1F" }}>{vet.rating}</span>
                              <span>({vet.user_ratings_total ?? 0})</span>
                            </span>
                          )}
                          {vet.rating && <span>·</span>}
                          <span className="flex items-center gap-0.5">
                            <span style={{ color: "#EF4444" }}>📍</span>
                            {vet.distKm.toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-xs font-semibold mt-0.5"
                          style={{ color: open === true ? "#16A34A" : open === false ? "#EF4444" : "#9B8778" }}>
                          {label}
                        </p>
                      </div>
                    </div>

                    {/* Species tags */}
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {tags.filter((t) => t !== "24/7").map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#F5F2EE", color: "#6B5E52" }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDirections(vet); }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                        style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                        Directions
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); callVet(vet); }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition"
                        style={{ backgroundColor: "#F5A623" }}>
                        Call
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}