import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import {
  collection, getDocs, doc, getDoc, setDoc, addDoc,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const GROQ_API_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const QUICK_PROMPTS = ["What pet suits me?", "Found a stray — what now?", "How do I apply?"];

const AI_INITIAL_MESSAGES = [
  { role: "assistant", content: "Hi! I'm PawPal Assistant ✨ How can I help you today?" },
  { role: "assistant", content: "I can help with adoption advice, pet care tips, find the perfect pet for you, or answer anything about PawPal!" },
];

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
      if (!found.find((f) => f.path === route.path)) found.push(route);
    }
  }
  return found.slice(0, 2);
}

async function fetchPawPalContext(userId) {
  let petsData = [], userProfile = null, shelters = [];
  try {
    const snap = await getDocs(collection(db, "pets"));
    petsData = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.status === "available");
  } catch {}
  try {
    if (userId) {
      const ud = await getDoc(doc(db, "users", userId));
      if (ud.exists()) userProfile = ud.data();
    }
  } catch {}
  try {
    const snap = await getDocs(collection(db, "users"));
    shelters = snap.docs.map((d) => d.data()).filter((u) => u.role === "shelter");
  } catch {}
  return { petsData, userProfile, shelters };
}

function buildSystemPrompt(petsData, userProfile, shelters) {
  const petsContext = petsData.length > 0
    ? `\n\nAvailable pets:\n` + petsData.map((p) =>
        `- ID:${p.id} | ${p.name} | ${p.species} | ${p.breed} | ${p.ageYears > 0 ? p.ageYears + " yrs" : p.ageMonths + " mos"} | ${p.gender} | personality: ${p.personality?.join(", ") || "not set"} | desc: ${p.description?.slice(0, 60) || ""} | location: ${p.address?.split(",")[0] ?? "Melaka"}`
      ).join("\n") : "";
  const sheltersCtx = shelters.length > 0
    ? `\n\nShelters:\n` + shelters.map((s) => `- ${s.name || s.shelterName || s.displayName}`).join("\n") : "";
  const userCtx = userProfile
    ? `\n\nUser: name=${userProfile.name || userProfile.displayName || "User"}, role=${userProfile.role || "adopter"}, prefs=${JSON.stringify(userProfile.preferences || {})}` : "";

  return `You are PawPal Assistant — friendly AI for PawPal, a Malaysian pet adoption app in Melaka.

IMPORTANT — when mentioning any specific pet, ALWAYS include VIEW_PET_ID:[pet_id] right after describing them. No exceptions.

When directing users to features, use these exact phrases:
- "report a stray" for stray reporting
- "post a lost pet" for lost pets
- "discover pets" for browsing
- "apply to adopt" for adoption
- "my applications" for tracking

PET MATCHMAKING: When asked what pet suits them, ask 3-4 short questions (living space, activity level, experience, personality preference), then match against available pets. Always include VIEW_PET_ID:[id] for each suggested pet.

PawPal flow: Browse Discover → Apply to adopt → Answer AI screening → Get suitability score → Owner reviews → Approved/Rejected → Then can message owner.
${userCtx}${petsContext}${sheltersCtx}

Be concise, warm, helpful. Never show raw IDs to users — only VIEW_PET_ID: tags for the app.`;
}

function formatTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withUid = searchParams.get("with");
  const withPetName = searchParams.get("pet");

  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [activeChat, setActiveChat] = useState("ai");
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat" — only affects < lg
  const [aiMessages, setAiMessages] = useState(AI_INITIAL_MESSAGES);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pawpalContext, setPawpalContext] = useState(null);

  const [chats, setChats] = useState([]);
  const [chatUserNames, setChatUserNames] = useState({});
  const [activeChatData, setActiveChatData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const bottomRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      setUserName(u?.displayName || "");
      if (u) {
        const ctx = await fetchPawPalContext(u.uid);
        setPawpalContext(ctx);
      }
    });
    return () => unsub();
  }, []);

  // Load all chats for current user
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, "chats"), async (snap) => {
      const userChats = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.participants?.includes(currentUser.uid))
        .sort((a, b) => (b.lastMessageAt?.toDate?.() ?? 0) - (a.lastMessageAt?.toDate?.() ?? 0));
      setChats(userChats);

      // Fetch display names for all other participants
      const otherUids = [...new Set(
        userChats.map((c) => c.participants?.find((p) => p !== currentUser.uid)).filter(Boolean)
      )];
      const names = {};
      await Promise.all(otherUids.map(async (uid) => {
        try {
          const ud = await getDoc(doc(db, "users", uid));
          if (ud.exists()) {
            const d = ud.data();
            names[uid] = d.orgName || d.shelterName || d.name || d.fullName || d.displayName || "User";
          } else {
            names[uid] = "User";
          }
        } catch {
          names[uid] = "User";
        }
      }));
      setChatUserNames((prev) => ({ ...prev, ...names }));
    });
    return () => unsub();
  }, [currentUser]);

  // Open chat if URL has ?with=uid
  useEffect(() => {
    if (!currentUser || !withUid) return;
    openOrCreateChat(withUid, withPetName);
  }, [currentUser, withUid]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatData) return;
    const msgsRef = query(
      collection(db, "chats", activeChatData.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(msgsRef, (snap) => {
      setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeChatData]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  const openOrCreateChat = async (otherUid, petName = null) => {
    const chatId = getChatId(currentUser.uid, otherUid);
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: [currentUser.uid, otherUid],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        petName: petName || null,
        createdAt: serverTimestamp(),
      });
    }

    // Fetch other user info
    let otherUser = null;
    try {
      const ud = await getDoc(doc(db, "users", otherUid));
      if (ud.exists()) otherUser = { id: otherUid, ...ud.data() };
    } catch {}

    setActiveChatData({
      id: chatId,
      otherUser,
      petName: petName || chatSnap.data()?.petName,
    });
    setActiveChat("user_" + chatId);
    setMobileView("chat");
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeChatData || sendingMsg) return;
    setSendingMsg(true);
    const text = chatInput.trim();
    setChatInput("");
    try {
      await addDoc(collection(db, "chats", activeChatData.id, "messages"), {
        senderId: currentUser.uid,
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", activeChatData.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
    finally { setSendingMsg(false); }
  };

  // AI chat
  function parseAiResponse(text) {
    const petMatches = [];
    const regex = /VIEW_PET_ID:([a-zA-Z0-9]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const pet = pawpalContext?.petsData?.find((p) => p.id === match[1]);
      if (pet) petMatches.push({ id: match[1], name: pet.name });
    }
    return { cleanText: text.replace(/VIEW_PET_ID:[a-zA-Z0-9]+/g, "").trim(), petMatches };
  }

  const sendAiMessage = async (text) => {
    if (!text.trim() || aiLoading) return;
    const userMsg = { role: "user", content: text.trim() };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    try {
      const ctx = pawpalContext || await fetchPawPalContext(currentUser?.uid);
      const systemPrompt = buildSystemPrompt(ctx.petsData, ctx.userProfile, ctx.shelters);
      const history = [...aiMessages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: systemPrompt }, ...history], temperature: 0.7 }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "Sorry, something went wrong.";
      const { cleanText, petMatches } = parseAiResponse(raw);
      setAiMessages((prev) => [...prev, { role: "assistant", content: cleanText, petMatches }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong.", petMatches: [] }]);
    } finally { setAiLoading(false); }
  };

  const getOtherUserName = (chat) => {
    const otherUid = chat.participants?.find((p) => p !== currentUser?.uid);
    return chatUserNames[otherUid] || "User";
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex min-w-0 overflow-hidden">

        {/* Contacts list — full width on mobile, hidden when a thread is open */}
        <div className={`${mobileView === "chat" ? "hidden" : "flex"} lg:flex flex-col w-full lg:w-[300px] lg:shrink-0 overflow-hidden`}
          style={{ backgroundColor: "white", borderRight: "1px solid #EEE8E0" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEE8E0" }}>
            <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* AI Assistant */}
            <button onClick={() => { setActiveChat("ai"); setMobileView("chat"); }} className="w-full flex items-center gap-3 px-4 py-4 text-left transition"
              style={{ backgroundColor: activeChat === "ai" ? "#FFF3E0" : "transparent", borderBottom: "1px solid #F5F2EE" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "#F5A623" }}>✨</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>PawPal Assistant</p>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F5A623", color: "white" }}>AI</span>
                  </div>
                  <p className="text-xs" style={{ color: "#9B8778" }}>now</p>
                </div>
                <p className="text-xs truncate" style={{ color: "#9B8778" }}>Ask me anything about pets...</p>
              </div>
            </button>

            {/* Real chats */}
            {chats.map((chat) => {
              const isActive = activeChat === "user_" + chat.id;
              const otherName = getOtherUserName(chat);
              return (
                <button key={chat.id} onClick={() => {
                  const otherUid = chat.participants?.find((p) => p !== currentUser?.uid);
                  if (otherUid) openOrCreateChat(otherUid, chat.petName);
                }} className="w-full flex items-center gap-3 px-4 py-4 text-left transition"
                  style={{ backgroundColor: isActive ? "#FFF3E0" : "transparent", borderBottom: "1px solid #F5F2EE" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-black" style={{ backgroundColor: "#F5EFE6", color: "#F5A623" }}>
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{otherName}</p>
                      <p className="text-xs shrink-0" style={{ color: "#9B8778" }}>{formatTime(chat.lastMessageAt)}</p>
                    </div>
                    {chat.petName && <p className="text-xs font-semibold mb-0.5" style={{ color: "#F5A623" }}>re: {chat.petName}</p>}
                    <p className="text-xs truncate" style={{ color: "#9B8778" }}>{chat.lastMessage || "No messages yet"}</p>
                  </div>
                </button>
              );
            })}

            {chats.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm" style={{ color: "#9B8778" }}>No chats yet. Chat with a shelter after applying to adopt.</p>
              </div>
            )}
          </div>
        </div>

        {/* Thread pane — full screen on mobile, hidden while viewing the list */}
        <div className={`${mobileView === "list" ? "hidden lg:flex" : "flex"} flex-1 min-w-0 overflow-hidden`}>

          {/* AI Chat */}
          {activeChat === "ai" && (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white" style={{ borderBottom: "1px solid #EEE8E0" }}>
                <button onClick={() => setMobileView("list")} aria-label="Back" className="lg:hidden -ml-1 p-1 rounded-lg" style={{ color: "#6B5E52" }}>‹</button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: "#F5A623" }}>✨</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>PawPal Assistant</p>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F5A623", color: "white" }}>AI</span>
                  </div>
                  <p className="text-xs" style={{ color: "#16A34A" }}>Always online</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                {aiMessages.map((msg, i) => {
                  const navBtns = msg.role === "assistant" ? detectNavButtons(msg.content) : [];
                  const petMatches = msg.petMatches ?? [];
                  return (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className="max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed"
                        style={{ backgroundColor: msg.role === "user" ? "#F5A623" : "white", color: msg.role === "user" ? "white" : "#3D2B1F", border: msg.role === "assistant" ? "1px solid #EEE8E0" : "none", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
                        {msg.content}
                      </div>
                      {petMatches.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {petMatches.map((pet) => (
                            <button key={pet.id} onClick={() => navigate(`/pet/${pet.id}`)}
                              className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                              style={{ backgroundColor: "#F5A623", color: "white" }}>
                              🐾 View {pet.name}'s profile
                            </button>
                          ))}
                        </div>
                      )}
                      {navBtns.length > 0 && petMatches.length === 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {navBtns.map((btn) => (
                            <button key={btn.label} onClick={() => navigate(btn.path)}
                              className="text-xs font-bold px-3 py-1.5 rounded-full"
                              style={{ backgroundColor: "white", border: "1.5px solid #F5A623", color: "#F5A623" }}>
                              → {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl text-sm" style={{ backgroundColor: "white", border: "1px solid #EEE8E0", borderRadius: "18px 18px 18px 4px" }}>
                      <span style={{ color: "#9B8778" }}>✨ Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div className="px-4 sm:px-6 pb-3 flex gap-2 flex-wrap">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => sendAiMessage(p)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "white", border: "1.5px solid #F5A623", color: "#F5A623" }}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white" style={{ border: "1.5px solid #EEE8E0" }}>
                  <input value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(aiInput); } }}
                    placeholder="Ask me anything about pets..."
                    className="flex-1 text-sm outline-none bg-transparent min-w-0" style={{ fontFamily: "'Nunito', sans-serif", color: "#3D2B1F" }} />
                  <button onClick={() => sendAiMessage(aiInput)} disabled={!aiInput.trim() || aiLoading}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: aiInput.trim() && !aiLoading ? "#F5A623" : "#F8C97A" }}>
                    ➤ Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User-to-user chat */}
          {activeChat.startsWith("user_") && activeChatData && (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white" style={{ borderBottom: "1px solid #EEE8E0" }}>
                <button onClick={() => setMobileView("list")} aria-label="Back" className="lg:hidden -ml-1 p-1 rounded-lg" style={{ color: "#6B5E52" }}>‹</button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black" style={{ backgroundColor: "#F5EFE6", color: "#F5A623" }}>
                  {(activeChatData.otherUser?.orgName || activeChatData.otherUser?.shelterName || activeChatData.otherUser?.name || activeChatData.otherUser?.fullName || activeChatData.otherUser?.displayName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>
                    {activeChatData.otherUser?.orgName || activeChatData.otherUser?.shelterName || activeChatData.otherUser?.name || activeChatData.otherUser?.fullName || activeChatData.otherUser?.displayName || "User"}
                  </p>
                  {activeChatData.petName && (
                    <p className="text-xs" style={{ color: "#9B8778" }}>About: {activeChatData.petName}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-semibold" style={{ color: "#9B8778" }}>Start the conversation!</p>
                    {activeChatData.petName && (
                      <p className="text-xs mt-1" style={{ color: "#B0A090" }}>about {activeChatData.petName}</p>
                    )}
                  </div>
                )}
                {chatMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed"
                        style={{ backgroundColor: isMe ? "#F5A623" : "white", color: isMe ? "white" : "#3D2B1F", border: !isMe ? "1px solid #EEE8E0" : "none", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 sm:px-6 pb-6">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white" style={{ border: "1.5px solid #EEE8E0" }}>
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 text-sm outline-none bg-transparent min-w-0" style={{ fontFamily: "'Nunito', sans-serif", color: "#3D2B1F" }} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim() || sendingMsg}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: chatInput.trim() && !sendingMsg ? "#F5A623" : "#F8C97A" }}>
                    ➤ Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No chat selected */}
          {!activeChat.startsWith("user_") && activeChat !== "ai" && (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: "#F5F2EE" }}>
              <p className="text-4xl mb-3">💬</p>
              <p className="font-black text-lg mb-1" style={{ color: "#3D2B1F" }}>Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}