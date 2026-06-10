import { useEffect, useRef, useState } from "react";

const MAPS_API_KEY = "AIzaSyADab1Ky8Qf_-hn7jjAmlqV714YD9P5Bz8";

// Load Maps script only once globally
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

export default function LocationPickerModal({ onConfirm, onClose }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        setAddress(data.results[0].formatted_address);
      }
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
    setLoading(false);
    setLocating(false);
  };

  useEffect(() => {
    // Default to Melaka immediately, then update with real location
    const DEFAULT_LAT = 2.2261;
    const DEFAULT_LNG = 102.3285;

    loadMapsScript(() => {
      // Start with default location right away
      initMap(DEFAULT_LAT, DEFAULT_LNG);

      // Then try to get real GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (markerRef.current) {
              const newPos = new window.google.maps.LatLng(lat, lng);
              markerRef.current.setPosition(newPos);
              markerRef.current.getMap().panTo(newPos);
              setCoords({ latitude: lat, longitude: lng });
              reverseGeocode(lat, lng);
            }
            setLocating(false);
          },
          () => setLocating(false),
          { timeout: 8000, maximumAge: 60000 }
        );
      } else {
        setLocating(false);
      }
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="rounded-3xl overflow-hidden flex flex-col"
        style={{ width: 600, maxHeight: "85vh", backgroundColor: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EEE8E0" }}>
          <div>
            <h2 className="font-black text-lg" style={{ color: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
              Pick a location
            </h2>
            <p className="text-xs" style={{ color: "#9B8778" }}>
              {locating ? "📍 Getting your location..." : "Tap the map or drag the pin to adjust"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: "#F5F2EE", color: "#6B5E52" }}
          >
            ×
          </button>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 380 }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: "#F5F2EE" }}>
              <p className="text-sm" style={{ color: "#9B8778", fontFamily: "'Nunito', sans-serif" }}>
                Loading map...
              </p>
            </div>
          )}
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Address + confirm */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid #EEE8E0" }}>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
            style={{ backgroundColor: "#FFF3E0", border: "1.5px solid #F5A623" }}
          >
            <span style={{ color: "#F5A623" }}>📍</span>
            <p className="text-sm font-semibold flex-1 truncate" style={{ color: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
              {address || "Detecting address..."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition"
              style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
            >
              Cancel
            </button>
            <button
              onClick={() => { if (coords && address) onConfirm({ address, coords }); }}
              disabled={!address}
              className="flex-[2] py-3 rounded-xl text-sm font-bold text-white transition"
              style={{ backgroundColor: address ? "#F5A623" : "#F8C97A" }}
            >
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}