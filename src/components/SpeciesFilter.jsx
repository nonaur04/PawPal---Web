const SPECIES = [
  { label: "All", emoji: "🐾" },
  { label: "Dogs", emoji: "🐶" },
  { label: "Cats", emoji: "🐱" },
  { label: "Rabbits", emoji: "🐰" },
  { label: "Birds", emoji: "🦜" },
  { label: "Others", emoji: "🐾" },
];

export default function SpeciesFilter({ active, onSelect }) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      {SPECIES.map((s) => {
        const isActive = active === s.label;
        return (
          <button
            key={s.label}
            onClick={() => onSelect(s.label)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition"
            style={{
              backgroundColor: isActive ? "#FFF3E0" : "white",
              border: isActive ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
              color: isActive ? "#F5A623" : "#6B5E52",
            }}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}