import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

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
  const [origName, setOrigName] = useState("");
  const [origPhone, setOrigPhone] = useState("");

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
          const name = data.name || data.displayName || u.displayName || "";
          setFullName(name); setOrigName(name);
          setPhone(data.phone || ""); setOrigPhone(data.phone || "");
          if (data.notifications) setNotifs((prev) => ({ ...prev, ...data.notifications }));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: fullName,
        phone,
        notifications: notifs,
      });
      setOrigName(fullName); setOrigPhone(phone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDiscard = () => {
    setFullName(origName);
    setPhone(origPhone);
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
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
                      placeholder="+60 12 345 6789"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle} />
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
                <p className="text-sm mb-4" style={{ color: "#9B8778" }}>Update what kind of pet you're looking to adopt.</p>
                <button onClick={() => navigate("/home")}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}>
                  Edit preferences →
                </button>
              </div>

              {/* Notifications */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h2 className="font-black text-base mb-5" style={{ color: "#3D2B1F" }}>Notifications</h2>
                <div className="space-y-4">
                  {NOTIF_LABELS.map((n, i) => (
                    <div key={n.key}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{n.label}</p>
                        <Toggle value={notifs[n.key]} onChange={(val) => {
                          setNotifs((prev) => ({ ...prev, [n.key]: val }));
                        }} />
                      </div>
                      {i < NOTIF_LABELS.length - 1 && <div className="mt-4" style={{ borderBottom: "1px solid #F5F2EE" }} />}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-5">
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: saving ? "#F8C97A" : "#F5A623" }}>
                    {saved ? "Saved ✓" : saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
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