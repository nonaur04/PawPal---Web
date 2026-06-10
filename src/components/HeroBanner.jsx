export default function HeroBanner({ name }) {
  return (
    <div
      className="relative rounded-2xl p-8 mb-6 overflow-hidden"
      style={{ backgroundColor: "#f0dbc3" }}
    >
      {/* Paw prints */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 pointer-events-none select-none">
        {[
          { size: 70, top: "10%", right: "18%", opacity: 0.15 },
          { size: 50, top: "20%", right: "8%", opacity: 0.12 },
          { size: 100, bottom: "5%", right: "5%", opacity: 0.12 },
          { size: 65, bottom: "15%", right: "20%", opacity: 0.10 },
        ].map((p, i) => (
          <svg
            key={i}
            className="absolute"
            style={{ width: p.size, top: p.top, right: p.right, bottom: p.bottom, opacity: p.opacity }}
            viewBox="0 0 100 100"
            fill="#8B7355"
          >
            <ellipse cx="50" cy="68" rx="27" ry="21" />
            <ellipse cx="22" cy="43" rx="11" ry="9" />
            <ellipse cx="41" cy="35" rx="10" ry="8" />
            <ellipse cx="61" cy="35" rx="10" ry="8" />
            <ellipse cx="79" cy="43" rx="11" ry="9" />
          </svg>
        ))}
      </div>

      <p className="text-sm font-semibold mb-2" style={{ color: "#9B8778" }}>Hello {name} !</p>
      <h1 className="text-4xl font-black mb-3 leading-tight" style={{ color: "#3D2B1F" }}>
        Ready to meet your<br />new best friend?
      </h1>
      <p className="text-sm max-w-md leading-relaxed" style={{ color: "#7A6654" }}>
        Browse pets from verified shelters and rehoming owners.<br />
        Apply with AI-scored matching to find the right fit.
      </p>
    </div>
  );
}