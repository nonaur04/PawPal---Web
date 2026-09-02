import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

export default function AdoptionIntroPage() {
  const { id, petName } = useParams();
  const navigate = useNavigate();
  const name = petName || "this pet";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <button
            onClick={() => navigate(`/pet/${id}`)}
            className="flex items-center gap-1 text-sm font-semibold mb-6"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back to {name}'s profile
          </button>

          <div
            className="max-w-2xl mx-auto rounded-3xl p-6 sm:p-10 text-center"
            style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}
          >
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
              style={{ backgroundColor: "#FFF3E0" }}
            >
              📋
            </div>

            <h1 className="text-3xl font-black mb-3" style={{ color: "#3D2B1F" }}>
              Let's find out if you and {name} are a match
            </h1>
            <p className="text-sm leading-relaxed mb-8 max-w-md mx-auto" style={{ color: "#9B8778" }}>
              Answer a few quick questions so we can screen your suitability for {name}.
              Your answers help the shelter understand your home and lifestyle — and give
              you an instant compatibility score.
            </p>

            {/* Info cards */}
            <div className="space-y-3 mb-8 text-left">
              {[
                { emoji: "🏠", title: "About your home", desc: "Environment, time, and space for a pet" },
                { emoji: "✨", title: `Tailored to ${name}`, desc: `Questions reflect ${name}'s specific needs` },
                { emoji: "⏱️", title: "Takes about 2 minutes", desc: "5 short questions, mix of multiple choice and short answers" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ backgroundColor: "#F5F2EE" }}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{item.title}</p>
                    <p className="text-xs" style={{ color: "#9B8778" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate(`/apply/${id}/${encodeURIComponent(name)}`)}
              className="w-full py-4 rounded-2xl text-white font-black text-base"
              style={{ backgroundColor: "#F5A623" }}
            >
              Start screening
            </button>
            <p className="text-xs mt-4" style={{ color: "#B0A090" }}>
              🔒 Your answers are shared only with the shelter.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}