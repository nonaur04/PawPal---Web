import { useNavigate, useLocation } from "react-router-dom";

const NAV = [
  { icon: "🏠", label: "Dashboard", path: "/shelter/dashboard" },
  { icon: "🐾", label: "Pet Listings", path: "/shelter/listings" },
  { icon: "📋", label: "Applications", path: "/shelter/applications" },
  { icon: "⚠️", label: "Stray Reports", path: "/shelter/stray-reports" },
  { icon: "🔍", label: "Lost Pets", path: "/shelter/lost-pets" },
  { icon: "🩺", label: "Vet Near Me", path: "/shelter/vet-near-me" },
  { icon: "💬", label: "Messages", path: "/shelter/messages" },
];

export default function ShelterSidebar({ orgName }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className="w-56 h-screen sticky top-0 flex flex-col justify-between py-6 px-4 shrink-0"
      style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid #EEE8E0" }}
    >
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#F59E0B" }}
          >
            🐾
          </div>
          <div>
            <p className="font-black text-base leading-tight" style={{ color: "#3D2B1F" }}>PawPal</p>
            <p className="text-xs" style={{ color: "#9B8778" }}>Shelter Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {NAV.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/shelter/dashboard" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{
                  backgroundColor: isActive ? "#FEF3C7" : "transparent",
                  color: isActive ? "#92400E" : "#6B5C52",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div>
        <button
          onClick={() => navigate("/shelter/profile")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition hover:bg-gray-50"
          style={{ color: "#6B5C52" }}
        >
          <span>🏢</span> Shelter Profile
        </button>
        <button
          onClick={() => navigate("/shelter/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-4 transition hover:bg-gray-50"
          style={{ color: "#6B5C52" }}
        >
          <span>⚙️</span> Settings
        </button>
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ backgroundColor: "#FEF3C7" }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: "#F59E0B" }}
          >
            🏠
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "#3D2B1F" }}>
              {orgName || "Shelter Account"}
            </p>
            <div className="flex items-center gap-1">
              <span style={{ color: "#22C55E", fontSize: 10 }}>✓</span>
              <p className="text-xs" style={{ color: "#9B8778" }}>Verified shelter</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}