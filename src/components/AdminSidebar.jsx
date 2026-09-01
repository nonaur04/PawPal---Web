// src/components/AdminSidebar.jsx
import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

/* ---- tiny inline icons (no extra dependency) ---- */
function PawIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="6" cy="10" r="2.1" />
      <circle cx="10" cy="6.5" r="2.1" />
      <circle cx="14" cy="6.5" r="2.1" />
      <circle cx="18" cy="10" r="2.1" />
      <path d="M12 12.5c-2.6 0-4.8 1.9-4.8 4.2 0 1.7 1.5 2.6 3.1 2.6.9 0 1.2-.3 1.7-.3s.8.3 1.7.3c1.6 0 3.1-.9 3.1-2.6 0-2.3-2.2-4.2-4.8-4.2z" />
    </svg>
  );
}
function OverviewIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 4-5" />
    </svg>
  );
}
function ShieldIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function ChevronIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * AdminSidebar
 * @param {string} adminName   display name for the admin (default "Admin")
 * @param {number} pendingCount badge number on Shelter Verification (default 0)
 */
export default function AdminSidebar({ adminName = "Admin", pendingCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } finally {
      navigate("/login");
    }
  };

  const navBase =
    "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors";

  return (
    <aside className="relative flex w-[260px] shrink-0 flex-col border-r border-[#EDE7DC] bg-white px-4 pb-4 pt-4">
      {/* workspace switcher pill */}
      <button className="mb-5 flex w-fit items-center gap-2 rounded-full border border-[#EFE9DF] bg-white px-3 py-1.5 text-[13px] font-bold text-[#C2650B] shadow-sm">
        Platform Overview
        <ChevronIcon className="h-3.5 w-3.5" />
      </button>

      {/* brand */}
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5A623] text-white">
          <PawIcon className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold text-[#2A2118]">PawPal</div>
          <div className="text-xs font-semibold text-[#C2650B]">Admin Console</div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex flex-col gap-1.5">
        <Link
          to="/admin"
          className={`${navBase} ${
            isActive("/admin")
              ? "bg-[#FCE9CE] text-[#B45309]"
              : "text-[#6B6153] hover:bg-[#F7F2EA]"
          }`}
        >
          <OverviewIcon className="h-5 w-5" />
          Overview
        </Link>

        <Link
          to="/admin/verification"
          className={`${navBase} ${
            isActive("/admin/verification")
              ? "bg-[#FCE9CE] text-[#B45309]"
              : "text-[#3B342B] hover:bg-[#F7F2EA]"
          }`}
        >
          <ShieldIcon className="h-5 w-5" />
          <span className="flex-1">Shelter Verification</span>
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5A623] px-1.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      </nav>

      {/* admin card + sign out */}
      <div className="mt-auto">
        <div className="flex items-center gap-3 rounded-2xl bg-[#FCE9CE] px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5A623] text-white">
            <ShieldIcon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-[#2A2118]">{adminName}</div>
            <div className="text-xs font-medium text-[#8A7B67]">Platform Admin</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full rounded-2xl border border-[#EDE7DC] bg-white py-2.5 text-sm font-semibold text-[#3B342B] hover:bg-[#F7F2EA]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}