export default function BrandingPanel() {
  return (
    <div
      className="flex w-3/5 relative overflow-hidden flex-col justify-between p-10"
      style={{ backgroundColor: "#FDF3E7" }}
    >
      {/* Decorative paw prints */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {[
          { top: "8%", right: "14%", size: 110, opacity: 0.13 },
          { top: "38%", right: "6%", size: 80, opacity: 0.09 },
          { bottom: "28%", right: "10%", size: 140, opacity: 0.10 },
          { bottom: "6%", right: "16%", size: 190, opacity: 0.09 },
        ].map((p, i) => (
          <svg key={i} className="absolute"
            style={{ top: p.top, right: p.right, bottom: p.bottom, width: p.size, opacity: p.opacity }}
            viewBox="0 0 100 100" fill="#8B7355">
            <ellipse cx="50" cy="68" rx="27" ry="21" />
            <ellipse cx="22" cy="43" rx="11" ry="9" />
            <ellipse cx="41" cy="35" rx="10" ry="8" />
            <ellipse cx="61" cy="35" rx="10" ry="8" />
            <ellipse cx="79" cy="43" rx="11" ry="9" />
          </svg>
        ))}
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
          <span className="text-white text-xl">🐾</span>
        </div>
        <span className="text-2xl font-black" style={{ color: "#C47F17", fontFamily: "'Nunito', sans-serif" }}>
          Paw<span style={{ color: "#3D2B1F" }}>Pal</span>
        </span>
      </div>

      {/* Hero */}
      <div className="relative z-10">
        <h1 className="text-5xl font-black leading-tight mb-5" style={{ color: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
          Find a friend.<br />Change a life.{" "}
          <span className="inline-block">🐾</span>
        </h1>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: "#7A6654" }}>
          One PawPal account for adopters and shelters alike. Sign in
          and we'll take you to the right place.
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-xs" style={{ color: "#B0A090" }}>
          © PawPal 2026 · Melaka, Malaysia
        </p>
      </div>
    </div>
  );
}