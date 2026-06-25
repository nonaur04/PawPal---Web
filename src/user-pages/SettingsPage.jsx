import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import {
  STATE_LIST,
  MALAYSIA_STATES,
  DAYS,
  MONTHS,
  YEARS,
} from "../data/onboardingData";

const ORANGE = "#F5A623";
const FIELD_BG = "#FAFAFA";

const PET_TYPE_LABEL = {
  dogs: "Dogs", cats: "Cats", rabbits: "Rabbits", birds: "Birds", others: "Others", any: "Any",
};

const SPECIAL_NEEDS_LABEL = {
  yes: "Yes, I'm okay with it",
  no: "No",
  doesnt_matter: "Doesn't matter",
};

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="relative inline-flex items-center shrink-0"
      style={{ width: 48, height: 28 }}>
      <div className="w-full h-full rounded-full transition-colors"
        style={{ backgroundColor: value ? "#F5A623" : "#D1C9C0" }} />
      <div className="absolute top-1 transition-all rounded-full bg-white"
        style={{ width: 20, height: 20, left: value ? 24 : 4, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

// Same compact custom dropdown used in onboarding, restyled to match Settings inputs
function Dropdown({ value, onChange, options, placeholder, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const selectedLabel = normalized.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none flex items-center justify-between gap-2 ${
          align === "center" ? "text-center justify-center" : ""
        }`}
        style={{ border: "1.5px solid #EEE8E0", backgroundColor: FIELD_BG, color: value ? "#3D2B1F" : "#B0A696" }}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          className="flex-shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl border z-20 overflow-y-auto"
          style={{ backgroundColor: "white", borderColor: "#E5E0D8", maxHeight: "240px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {normalized.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm transition"
              style={{
                color: opt.value === value ? ORANGE : "#1a1a1a",
                fontWeight: opt.value === value ? 700 : 500,
                backgroundColor: opt.value === value ? "#FFF8EE" : "white",
              }}
              onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.backgroundColor = "#F7F5F1"; }}
              onMouseLeave={(e) => { if (opt.value !== value) e.currentTarget.style.backgroundColor = "white"; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Account fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");

  // Snapshot of original values, for Discard
  const [original, setOriginal] = useState({});

  // Read-only preference summary (edited via onboarding-style flow elsewhere, not here)
  const [petTypePreferences, setPetTypePreferences] = useState([]);
  const [breedPreferences, setBreedPreferences] = useState({});
  const [specialNeedsPreference, setSpecialNeedsPreference] = useState("");

  // Notification toggles
  const [notifs, setNotifs] = useState({
    newPetMatches: true,
    applicationUpdates: true,
    messagesFromShelters: true,
    strayReportsNearby: false,
    weeklyDigest: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUser(u);
      setUserName(u.displayName || "");
      setEmail(u.email || "");
      try {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const name = data.name || data.fullName || data.displayName || u.displayName || "";
          const ph = data.phone || "";
          const st = data.state || "";
          const ct = data.city || "";
          let day = "", month = "", year = "";
          if (data.dateOfBirth) {
            const parts = data.dateOfBirth.split("-");
            year = parts[0] || ""; month = parts[1] || ""; day = parts[2] || "";
          }

          setFullName(name);
          setPhone(ph);
          setState(st);
          setCity(ct);
          setDobDay(day);
          setDobMonth(month);
          setDobYear(year);
          setOriginal({ name, phone: ph, state: st, city: ct, dobDay: day, dobMonth: month, dobYear: year });

          setPetTypePreferences(data.petTypePreferences || []);
          setBreedPreferences(data.breedPreferences || {});
          setSpecialNeedsPreference(data.specialNeedsPreference || "");

          if (data.notifications) setNotifs((prev) => ({ ...prev, ...data.notifications }));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const cityOptions = state ? MALAYSIA_STATES[state] || [] : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateOfBirth = dobDay && dobMonth && dobYear ? `${dobYear}-${dobMonth}-${dobDay}` : null;
      await updateDoc(doc(db, "users", user.uid), {
        name: fullName,
        phone,
        state: state || null,
        city: city || null,
        dateOfBirth,
        notifications: notifs,
      });
      setOriginal({ name: fullName, phone, state, city, dobDay, dobMonth, dobYear });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDiscard = () => {
    setFullName(original.name || "");
    setPhone(original.phone || "");
    setState(original.state || "");
    setCity(original.city || "");
    setDobDay(original.dobDay || "");
    setDobMonth(original.dobMonth || "");
    setDobYear(original.dobYear || "");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Please sign out and sign back in before deleting your account.");
    }
  };

  const NOTIF_LABELS = [
    { key: "newPetMatches", label: "New pet matches" },
    { key: "applicationUpdates", label: "Application status updates" },
    { key: "messagesFromShelters", label: "Messages from shelters" },
    { key: "strayReportsNearby", label: "Stray reports nearby" },
    { key: "weeklyDigest", label: "Weekly digest" },
  ];

  const inputStyle = {
    border: "1.5px solid #EEE8E0", backgroundColor: "#FAFAFA",
    fontFamily: "'Nunito', sans-serif", color: "#3D2B1F",
  };

  const lookingForLabel = petTypePreferences.length === 0 || petTypePreferences.includes("any")
    ? "Any"
    : petTypePreferences.map((t) => PET_TYPE_LABEL[t] || t).join(", ");

  const breedSummary = (() => {
    if (petTypePreferences.length === 0 || petTypePreferences.includes("any")) return "Any";
    const parts = petTypePreferences
      .filter((t) => t !== "any")
      .map((type) => {
        const breeds = breedPreferences?.[type];
        if (!breeds || breeds.length === 0) return null;
        return `${PET_TYPE_LABEL[type] || type}: ${breeds.join(", ")}`;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Any";
  })();

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Settings</h1>
            <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Manage your account and preferences</p>

            {loading ? (
              <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="rounded-2xl h-32 animate-pulse" style={{ backgroundColor: "white" }} />)}</div>
            ) : (
              <div className="max-w-3xl space-y-5">

                {/* Account */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <h2 className="font-black text-base mb-5" style={{ color: "#3D2B1F" }}>Account</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Full name</label>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Email</label>
                      <input value={email} disabled
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ ...inputStyle, backgroundColor: "#F5F2EE", color: "#9B8778", cursor: "not-allowed" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Phone</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="01X-XXXXXXX"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle} />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Location</label>
                      <div className="grid grid-cols-2 gap-3">
                        <Dropdown
                          value={state}
                          onChange={(val) => { setState(val); setCity(""); }}
                          options={STATE_LIST}
                          placeholder="State"
                        />
                        <Dropdown
                          value={city}
                          onChange={setCity}
                          options={cityOptions}
                          placeholder="City"
                        />
                      </div>
                    </div>

                    {/* Date of birth */}
                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Date of birth</label>
                      <div className="grid grid-cols-3 gap-3">
                        <Dropdown value={dobDay} onChange={setDobDay} options={DAYS} placeholder="Day" align="center" />
                        <Dropdown value={dobMonth} onChange={setDobMonth} options={MONTHS} placeholder="Month" />
                        <Dropdown value={dobYear} onChange={setDobYear} options={YEARS} placeholder="Year" align="center" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-5">
                    <button onClick={handleDiscard}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                      Discard
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: saving ? "#F8C97A" : "#F5A623" }}>
                      {saved ? "Saved ✓" : saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>

                {/* Adoption preferences */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <h2 className="font-black text-base mb-1" style={{ color: "#3D2B1F" }}>Adoption preferences</h2>
                  <p className="text-sm mb-4" style={{ color: "#9B8778" }}>What kind of pet you're looking to adopt.</p>
                  <div className="space-y-3 mb-4">
                    {[
                      { label: "Looking for", value: lookingForLabel },
                      { label: "Breeds", value: breedSummary },
                      { label: "Special needs OK?", value: SPECIAL_NEEDS_LABEL[specialNeedsPreference] || "Doesn't matter" },
                    ].map((p) => (
                      <div key={p.label} className="flex items-start justify-between gap-3 py-2"
                        style={{ borderBottom: "1px solid #F5F2EE" }}>
                        <p className="text-sm shrink-0" style={{ color: "#9B8778" }}>{p.label}</p>
                        <p className="text-sm font-bold text-right" style={{ color: "#3D2B1F" }}>{p.value}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate("/onboarding?step=preference")}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                    Edit preferences →
                  </button>
                </div>

                {/* Sign out + Delete */}
                <div className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <button onClick={() => setShowSignOutConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                    Sign out
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ border: "1.5px solid #EF4444", color: "#EF4444", backgroundColor: "white" }}>
                    Delete account
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Sign out confirm */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-3xl p-8 text-center max-w-sm w-full mx-4" style={{ backgroundColor: "white" }}>
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#3D2B1F" }}>Sign out?</h2>
            <p className="text-sm mb-6" style={{ color: "#9B8778" }}>You can always sign back in anytime.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                Cancel
              </button>
              <button onClick={handleSignOut}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#F5A623" }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-3xl p-8 text-center max-w-sm w-full mx-4" style={{ backgroundColor: "white" }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "#3D2B1F" }}>Delete account?</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#9B8778" }}>
              This will permanently delete your account and all your data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#EF4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}