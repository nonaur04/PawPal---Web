import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-white" style={{ borderBottom: "1px solid #EEE8E0" }}>
      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}>
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
          placeholder="Search for pets, shelters, breeds..."
        />
      </div>
      <button
        onClick={() => navigate("/post-pet")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: "#F5A623" }}
      >
        <span>+</span> Post a pet
      </button>
      <button className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}>
        <span>🔔</span>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#F5A623" }}></span>
      </button>
    </div>
  );
}