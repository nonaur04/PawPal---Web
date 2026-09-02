import { useNavigate } from "react-router-dom";
import { openNav } from "./useMobileNav";

export default function TopBar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-4 lg:px-6 py-4 bg-white" style={{ borderBottom: "1px solid #EEE8E0" }}>
      {/* Hamburger — mobile only */}
      <button
        onClick={openNav}
        aria-label="Open menu"
        className="lg:hidden p-2 -ml-1 rounded-lg shrink-0 transition hover:bg-gray-50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl min-w-0" style={{ backgroundColor: "#F5F2EE", border: "1px solid #EEE8E0" }}>
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 min-w-0"
          placeholder="Search for pets, shelters, breeds..."
        />
      </div>
      <button
        onClick={() => navigate("/post-pet")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: "#F5A623" }}
      >
        <span>+</span> <span className="hidden sm:inline">Post a pet</span>
      </button>
    </div>
  );
}