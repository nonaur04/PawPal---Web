import { useNavigate } from "react-router-dom";

const GENDER_ICON = { male: "♂", female: "♀" };

export default function YourListings({ listings }) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-1">
        <div>
          <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>Your Furry Listings 🐾</h2>
          <p className="text-xs" style={{ color: "#9B8778" }}>Pets you're rehoming</p>
        </div>
        <button className="text-sm font-bold flex items-center gap-1" style={{ color: "#F5A623" }}>
          Manage <span>›</span>
        </button>
      </div>

      <div className="flex gap-4 mt-4 flex-wrap">
        {listings.map((pet) => (
          <div
            key={pet.id}
            onClick={() => navigate(`/my-pet/${pet.id}`)}
            className="rounded-2xl overflow-hidden cursor-pointer transition hover:scale-[1.02]"
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
              {pet.photoUrl
                ? <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                : <span style={{ fontSize: 64 }}>{pet.emoji}</span>
              }
              <span
                className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
                style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#16A34A" }}></span>
                {pet.status}
              </span>
            </div>
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-black text-base" style={{ color: "#3D2B1F" }}>{pet.name}</p>
                <span className="text-sm" style={{ color: "#9B8778" }}>{GENDER_ICON[pet.gender]}</span>
              </div>
              <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#F5A623" }}>
                🤍 {pet.applicants} applicants
              </p>
            </div>
          </div>
        ))}

        {/* Post another pet */}
        <div
          onClick={() => navigate("/post-pet")}
          className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:scale-[1.02]"
          style={{ width: 210, height: 240, backgroundColor: "white", border: "1.5px dashed #F5A623" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3"
            style={{ backgroundColor: "#FFF3E0" }}
          >
            ➕
          </div>
          <p className="font-bold text-sm" style={{ color: "#3D2B1F" }}>Post another pet</p>
          <p className="text-xs mt-1" style={{ color: "#9B8778" }}>Find them a home 🧡</p>
        </div>
      </div>
    </div>
  );
}