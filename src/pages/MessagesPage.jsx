import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const GROQ_API_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const QUICK_PROMPTS = [
  "What pet suits me?",
  "Found a stray — what now?",
  "How do I apply?",
];

const INITIAL_MESSAGES = [
  { role: "assistant", content: "Hi! I'm PawPal Assistant ✨ How can I help you today?" },
  { role: "assistant", content: "I can help with adoption advice, pet care tips, find the perfect pet for you, or answer anything about PawPal!" },
];

const DUMMY_CONTACTS = [];

const ROUTE_KEYWORDS = [
  { keywords: ["discover", "browse pets", "view pets", "find pets", "based on your preference"], label: "Go to Discover", path: "/home" },
  { keywords: ["apply to adopt", "adoption form", "screening question"], label: "Apply to Adopt", path: "/home" },
  { keywords: ["my applications", "track application", "application status"], label: "My Applications", path: "/applications" },
  { keywords: ["report a stray", "new stray report"], label: "Report a Stray", path: "/reports/new-stray" },
  { keywords: ["post a lost", "lost your pet", "post lost", "report lost", "lost cat", "lost dog", "lost pet", "missing pet"], label: "Post a Lost Pet", path: "/reports/new-lost" },
  { keywords: ["stray reports", "lost reports", "reports section", "reports page"], label: "Go to Reports", path: "/reports" },
  { keywords: ["post a pet", "rehome your pet"], label: "Post a Pet", path: "/post-pet" },
];

function detectNavButtons(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const route of ROUTE_KEYWORDS) {
    if (route.keywords.some((kw) => lower.includes(kw))) {
      if (!found.find((f) => f.path === route.path)) {
        found.push(route);
      }
    }
  }
  return found.slice(0, 2);
}

async function fetchPawPalContext(userId) {
  let petsData = [];
  let userProfile = null;
  let shelters = [];

  try {
    const petsSnap = await getDocs(collection(db, "pets"));
    petsData = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.status === "available");
  } catch {}

  try {
    if (userId) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) userProfile = userDoc.data();
    }
  } catch {}

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    shelters = usersSnap.docs.map((d) => d.data()).filter((u) => u.role === "shelter");
  } catch {}

  return { petsData, userProfile, shelters };
}

function buildSystemPrompt(petsData, userProfile, shelters) {
  const petsContext = petsData.length > 0
    ? `\n\nAvailable pets on PawPal (include pet id for linking):\n` +
      petsData.map((p) =>
        `- ID:${p.id} | ${p.name} | ${p.species} | ${p.breed} | ${p.ageYears > 0 ? p.ageYears + " yrs" : p.ageMonths + " mos"} | ${p.gender} | personality: ${p.personality?.join(", ") || "not set"} | color/desc: ${p.description?.slice(0, 60) || "no desc"} | location: ${p.address?.split(",")[0] ?? "Melaka"}`
      ).join("\n")
    : "";

  const sheltersContext = shelters.length > 0
    ? `\n\nRegistered shelters:\n` + shelters.map((s) => `- ${s.name || s.shelterName || s.displayName}`).join("\n")
    : "";

  const userContext = userProfile
    ? `\n\nUser profile: name=${userProfile.name || userProfile.displayName || "User"}, role=${userProfile.role || "adopter"}, preferences=${JSON.stringify(userProfile.preferences || {})}`
    : "";

  return `You are PawPal Assistant, a friendly AI helper for PawPal — a Malaysian pet adoption platform in Melaka, Malaysia.

You have two main roles:
1. Answer questions about PawPal (how to adopt, report strays, post lost pets, etc.)
2. Help users find their perfect pet match through a conversational quiz

PawPal adoption flow: Browse pets in Discover → Click "Apply to adopt" → Answer AI screening questions → Get AI suitability score → Shelter/owner reviews → Approved or rejected.

PawPal features:
- Discover: browse pets, filter by species, see "Pets Near You" and "Based on your preference"
- My Applications: track applications and AI scores
- Reports: report strays or post lost pets  
- Post a pet: rehome your own pet
- Messages: chat with PawPal Assistant (you) or shelters/owners

IMPORTANT RULE — ALWAYS follow this when mentioning any specific pet by name:
- Whenever you mention or describe a specific pet, you MUST include VIEW_PET_ID:[pet_id] at the end of that sentence or paragraph. No exceptions.
- Example: "Camel is a lovely Poodle! VIEW_PET_ID:KYp0412FDUiV0VRsAamd"
- This applies whether the user asks to see a pet profile, asks about a specific pet, or you are recommending a pet.
- Never tell the user to "go to Discover" to find a specific pet — always give them the direct VIEW_PET_ID link instead.

PET MATCHMAKING INSTRUCTIONS:
When a user asks what pet suits them, wants a pet recommendation, or seems unsure:
1. Ask them 3-4 short questions one at a time: living space (apartment/house/condo), activity level (active/relaxed/moderate), experience with pets (first-time/experienced), preferred personality (playful/calm/cuddly/independent)
2. After they answer, match against the available pets list using species, personality, breed, and description
3. Suggest 1-3 best matching pets with their name, why they match, and include the text "VIEW_PET_ID:[pet_id]" at the end of each suggestion so the app can create a button. Example: "Comel would be perfect for you! VIEW_PET_ID:KYp0412FDUiV0VRsAamd"
4. If no perfect match, suggest closest options
5. Always be warm and encouraging
${userContext}
${petsContext}
${sheltersContext}

When directing users to a feature, always use these exact phrases so the app can show navigation buttons:
- To report a stray: say "report a stray"
- To post a lost pet: say "post a lost pet" or "report lost pet"
- To browse pets: say "discover pets" or "browse pets"
- To apply for adoption: say "apply to adopt"
- To track applications: say "my applications"
- To post a pet for rehoming: say "post a pet"

`;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [activeChat, setActiveChat] = useState("ai");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pawpalContext, setPawpalContext] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUserName(u?.displayName || "");
      setUserId(u?.uid ?? null);
      if (u) {
        const ctx = await fetchPawPalContext(u.uid);
        setPawpalContext(ctx);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Parse AI response: extract pet IDs and nav buttons
  function parseResponse(text) {
    const petMatches = [];
    const regex = /VIEW_PET_ID:([a-zA-Z0-9]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const petId = match[1];
      const pet = pawpalContext?.petsData?.find((p) => p.id === petId);
      if (pet) petMatches.push({ id: petId, name: pet.name });
    }
    const cleanText = text.replace(/VIEW_PET_ID:[a-zA-Z0-9]+/g, "").trim();
    return { cleanText, petMatches };
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const ctx = pawpalContext || await fetchPawPalContext(userId);
      if (!pawpalContext) setPawpalContext(ctx);

      const systemPrompt = buildSystemPrompt(ctx.petsData, ctx.userProfile, ctx.shelters);
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...history],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const rawReply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't process that. Please try again.";
      const { cleanText, petMatches } = parseResponse(rawReply);

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: cleanText,
        petMatches,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again.", petMatches: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex min-w-0 overflow-hidden">

        {/* Contacts list */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 300, backgroundColor: "white", borderRight: "1px solid #EEE8E0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEE8E0" }}>
            <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* PawPal Assistant */}
            <button onClick={() => setActiveChat("ai")}
              className="w-full flex items-center gap-3 px-4 py-4 text-left transition"
              style={{ backgroundColor: activeChat === "ai" ? "#FFF3E0" : "transparent", borderBottom: "1px solid #F5F2EE" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "#F5A623" }}>✨</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>PawPal Assistant</p>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F5A623", color: "white" }}>AI</span>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: "#9B8778" }}>now</p>
                </div>
                <p className="text-xs truncate" style={{ color: "#9B8778" }}>Ask me anything about pets...</p>
              </div>
            </button>
            {DUMMY_CONTACTS.map((c) => (
              <button key={c.id} onClick={() => setActiveChat(c.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left transition"
                style={{ backgroundColor: activeChat === c.id ? "#FFF3E0" : "transparent", borderBottom: "1px solid #F5F2EE" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "#F5EFE6" }}>{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{c.name}</p>
                    <p className="text-xs shrink-0" style={{ color: "#9B8778" }}>{c.time}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs truncate flex-1" style={{ color: "#9B8778" }}>{c.preview}</p>
                    {c.unread > 0 && <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2" style={{ backgroundColor: "#F5A623", color: "white" }}>{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {activeChat === "ai" ? (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white" style={{ borderBottom: "1px solid #EEE8E0" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: "#F5A623" }}>✨</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>PawPal Assistant</p>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F5A623", color: "white" }}>AI</span>
                </div>
                <p className="text-xs" style={{ color: "#16A34A" }}>Always online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map((msg, i) => {
                const navButtons = msg.role === "assistant" ? detectNavButtons(msg.content) : [];
                const petMatches = msg.petMatches ?? [];
                return (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className="max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: msg.role === "user" ? "#F5A623" : "white",
                        color: msg.role === "user" ? "white" : "#3D2B1F",
                        border: msg.role === "assistant" ? "1px solid #EEE8E0" : "none",
                        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      }}>
                      {msg.content}
                    </div>
                    {/* Pet profile buttons */}
                    {petMatches.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {petMatches.map((pet) => (
                          <button key={pet.id} onClick={() => navigate(`/pet/${pet.id}`)}
                            className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                            style={{ backgroundColor: "#F5A623", color: "white" }}>
                            🐾 View {pet.name}'s profile
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Nav buttons */}
                    {navButtons.length > 0 && petMatches.length === 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {navButtons.map((btn) => (
                          <button key={btn.label} onClick={() => navigate(btn.path)}
                            className="text-xs font-bold px-3 py-1.5 rounded-full transition"
                            style={{ backgroundColor: "white", border: "1.5px solid #F5A623", color: "#F5A623" }}>
                            → {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl text-sm" style={{ backgroundColor: "white", border: "1px solid #EEE8E0", borderRadius: "18px 18px 18px 4px" }}>
                    <span style={{ color: "#9B8778" }}>✨ Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-6 pb-3 flex gap-2 flex-wrap">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
                  style={{ backgroundColor: "white", border: "1.5px solid #F5A623", color: "#F5A623" }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white" style={{ border: "1.5px solid #EEE8E0" }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about pets..."
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ fontFamily: "'Nunito', sans-serif", color: "#3D2B1F" }} />
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0 transition"
                  style={{ backgroundColor: input.trim() && !loading ? "#F5A623" : "#F8C97A" }}>
                  ➤ Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
            <p className="text-4xl mb-3">💬</p>
            <p className="font-black text-lg mb-1" style={{ color: "#3D2B1F" }}>Chat coming soon</p>
            <p className="text-sm" style={{ color: "#9B8778" }}>Real-time messaging will be available here.</p>
          </div>
        )}
      </div>
    </div>
  );
}