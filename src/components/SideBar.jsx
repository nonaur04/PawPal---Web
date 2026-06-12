import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const NAV = [
  { icon: "🏠", label: "Discover", path: "/home" },
  { icon: "📋", label: "Applications", path: "/applications" },
  { icon: "⚠️", label: "Reports", path: "/reports" },
  { icon: "💬", label: "Messages", path: "/messages" },
  { icon: "🏥", label: "Vet Near Me", path: "/vet-near-me" },
];

export default function Sidebar({ userName }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <aside className="w-56 flex flex-col justify-between py-6 px-4 shrink-0 h-screen sticky top-0" style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid #EEE8E0" }}>
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
            <span className="text-white text-base">🐾</span>
          </div>
          <span className="text-xl font-black" style={{ color: "#C47F17" }}>
            Paw<span style={{ color: "#3D2B1F" }}>Pal</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {NAV.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/home" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{
                  backgroundColor: isActive ? "#FFF3E0" : "transparent",
                  color: isActive ? "#F5A623" : "#6B5E52",
                }}
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div>
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition hover:bg-gray-50"
          style={{ color: "#6B5E52" }}
        >
          <span>👤</span> Profile
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-4 transition hover:bg-gray-50"
          style={{ color: "#6B5E52" }}
        >
          <span>⚙️</span> Settings
        </button>
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl" style={{ backgroundColor: "#FFF3E0" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: "#F5A623" }}>
            🐱
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "#3D2B1F" }}>{userName || "Pet Lover"}</p>
            <p className="text-xs" style={{ color: "#9B8778" }}>Pet Adopter</p>
          </div>
        </div>
      </div>
    </aside>
  );
}