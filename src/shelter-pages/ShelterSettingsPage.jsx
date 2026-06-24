import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ShelterSidebar from "../components/ShelterSidebar";
import ShelterTopBar from "../components/ShelterTopBar";

export default function ShelterSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");

  // Originals for discard
  const [orig, setOrig] = useState({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUser(u);
      try {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const values = {
            orgName: data.orgName || "",
            location: data.location || "",
            phone: data.phone || "",
            email: data.email || u.email || "",
            website: data.website || "",
            about: data.description || "",
          };
          setOrgName(values.orgName);
          setLocation(values.location);
          setPhone(values.phone);
          setEmail(values.email);
          setWebsite(values.website);
          setAbout(values.about);
          setOrig(values);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        orgName,
        location,
        phone,
        website,
        description: about,
      });
      const values = { orgName, location, phone, email, website, about };
      setOrig(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setOrgName(orig.orgName || "");
    setLocation(orig.location || "");
    setPhone(orig.phone || "");
    setEmail(orig.email || "");
    setWebsite(orig.website || "");
    setAbout(orig.about || "");
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

  const inputStyle = {
    border: "1.5px solid #EEE8E0",
    backgroundColor: "#FAFAFA",
    fontFamily: "'Nunito', sans-serif",
    color: "#3D2B1F",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <ShelterSidebar orgName={orgName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ShelterTopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>Settings</h1>
          <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Manage your shelter account</p>

          {loading ? (
            <div className="space-y-4 max-w-3xl">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-32 animate-pulse" style={{ backgroundColor: "white" }} />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">

              {/* Organization information */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <h2 className="font-black text-base mb-5" style={{ color: "#3D2B1F" }}>Organization information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Shelter name</label>
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Location</label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Durian Tunggal, Melaka"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 6-282 1234"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Email</label>
                    <input
                      value={email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ ...inputStyle, backgroundColor: "#F5F2EE", color: "#9B8778", cursor: "not-allowed" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>Website</label>
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="yourshelter.org"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B5E52" }}>About</label>
                    <textarea
                      rows={4}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Tell adopters about your shelter..."
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={handleDiscard}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: saving ? "#F8C97A" : "#F5A623" }}
                  >
                    {saved ? "Saved ✓" : saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>

              {/* Sign out + Delete */}
              <div className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                >
                  Sign out
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ border: "1.5px solid #EF4444", color: "#EF4444", backgroundColor: "white" }}
                >
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
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#F5A623" }}
              >
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
              This will permanently delete your shelter account and all your data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#EF4444" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}