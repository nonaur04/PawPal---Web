import { useNavigate } from "react-router-dom";

const GENDER_ICON = { male: "♂", female: "♀" };

export default function PetCard({ pet }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/pet/${pet.id}`)}
      className="rounded-2xl overflow-hidden shrink-0 cursor-pointer transition hover:scale-[1.02]"
      style={{ width: 210, backgroundColor: "white", border: "1px solid #EEE8E0" }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 160,
          backgroundColor: pet.bg,
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)",
        }}
      >
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: 64 }}>{pet.emoji}</span>
        )}
        {pet.vaccinated && (
          <span className="absolute bottom-3 left-3 text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#22C55E", color: "white" }}>
            Vaccinated
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{pet.name}</p>
          <span className="text-sm" style={{ color: "#9B8778" }}>{GENDER_ICON[pet.gender] ?? ""}</span>
        </div>
        <p className="text-xs mb-1.5" style={{ color: "#9B8778" }}>{pet.breed} · {pet.age}</p>
        {pet.distance && (
          <p className="text-xs flex items-center gap-1" style={{ color: "#9B8778" }}>📍 {pet.distance} · {pet.area}</p>
        )}
        {!pet.distance && pet.area && (
          <p className="text-xs flex items-center gap-1" style={{ color: "#9B8778" }}>📍 {pet.area}</p>
        )}
      </div>
    </div>
  );
}