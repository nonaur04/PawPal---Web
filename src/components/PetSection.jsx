import { useNavigate } from "react-router-dom";
import PetCard from "./PetCard";

export default function PetSection({ title, subtitle, pets, browseType }) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between mb-1">
        <div>
          <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>{title}</h2>
          <p className="text-xs" style={{ color: "#9B8778" }}>{subtitle}</p>
        </div>
        <button
          onClick={() => navigate(`/browse?type=${browseType}`)}
          className="text-sm font-bold flex items-center gap-1"
          style={{ color: "#F5A623" }}
        >
          View all <span>›</span>
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 mt-4" style={{ scrollbarWidth: "none" }}>
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  );
}