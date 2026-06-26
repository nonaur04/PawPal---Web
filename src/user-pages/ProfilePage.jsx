import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0", bird: "#C4E0F2", others: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾" };

const PET_TYPE_LABEL = {
  dogs: "Dogs", cats: "Cats", rabbits: "Rabbits", birds: "Birds", others: "Others", any: "Any",
};

const SPECIAL_NEEDS_LABEL = {
  yes: "Yes, I'm okay with it",
  no: "No",
  doesnt_matter: "Doesn't matter",
};

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function formatAge(years, months) {
  if (years > 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${months} mo${months !== 1 ? "s" : ""}`;
}

function formatDOB(dateOfBirth) {
  if (!dateOfBirth) return null;
  const [year, month, day] = dateOfBirth.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return dateOfBirth;
  return `${parseInt(day, 10)} ${months[monthIndex]} ${year}`;
}

function formatBreedSummary(breedPreferences, petTypePreferences) {
  if (!petTypePreferences || petTypePreferences.length === 0 || petTypePreferences.includes("any")) {
    return "Any";
  }
  const parts = petTypePreferences
    .filter((t) => t !== "any")
    .map((type) => {
      const breeds = breedPreferences?.[type];
      if (!breeds || breeds.length === 0) return null;
      const label = PET_TYPE_LABEL[type] || type;
      return `${label}: ${breeds.join(", ")}`;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Any";
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ applications: 0, favorites: 0, reports: 0, listings: 0 });
  const [favoritePets, setFavoritePets] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUser(u);
      setUserName(u.displayName || "");

      try {
        // User profile
        const profileDoc = await getDoc(doc(db, "users", u.uid));
        const profileData = profileDoc.exists() ? profileDoc.data() : {};
        setProfile(profileData);

        // Applications count
        const appsSnap = await getDocs(collection(db, "applications"));
        const myApps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.applicantId === u.uid)
          .sort((a, b) => (b.createdAt?.toDate?.() ?? 0) - (a.createdAt?.toDate?.() ?? 0));

        // Pets listings
        const petsSnap = await getDocs(collection(db, "pets"));
        const allPets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myListings = allPets.filter((p) => p.ownerId === u.uid);

        // Favorites (from user profile or pets with liked field)
        const favoriteIds = profileData.favorites || [];
        const favPets = allPets.filter((p) => favoriteIds.includes(p.id)).slice(0, 4);

        // Reports count
        const straySnap = await getDocs(collection(db, "stray_reports"));
        const myStrays = straySnap.docs.filter((d) => {
          const data = d.data();
          return data.reporterId === u.uid || data.userId === u.uid;
        });
        const lostSnap = await getDocs(collection(db, "lost_found"));
        const myLost = lostSnap.docs.filter((d) => {
          const data = d.data();
          return data.reporterId === u.uid || data.userId === u.uid;
        });
        const totalReports = myStrays.length + myLost.length;

        setStats({
          applications: myApps.length,
          favorites: favoriteIds.length,
          reports: totalReports,
          listings: myListings.length,
        });
        setFavoritePets(favPets);

        // Recent activity
        const activity = [];
        myApps.slice(0, 2).forEach((a) => {
          activity.push({ icon: "🐾", text: `Applied to adopt ${a.petName}`, time: a.createdAt, color: "#FFF3E0" });
        });
        myStrays.slice(0, 1).forEach((d) => {
          const data = d.data();
          activity.push({ icon: "🚨", text: `Reported ${data.title || "a stray"}`, time: data.createdAt, color: "#FEE2E2" });
        });
        myLost.slice(0, 1).forEach((d) => {
          const data = d.data();
          activity.push({ icon: "😿", text: `Posted lost pet: ${data.petName || "a pet"}`, time: data.createdAt, color: "#FEE2E2" });
        });
        activity.sort((a, b) => (b.time?.toDate?.() ?? 0) - (a.time?.toDate?.() ?? 0));
        setRecentActivity(activity.slice(0, 4));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const displayName = profile?.name || profile?.fullName || profile?.displayName || userName || "User";
  const role = profile?.role === "shelter" ? "Shelter" : "Pet Adopter";
  const location = profile?.city && profile?.state
    ? `${profile.city}, ${profile.state}`
    : profile?.state || "Melaka, Malaysia";
  const dobFormatted = formatDOB(profile?.dateOfBirth);
  const petTypePreferences = profile?.petTypePreferences || [];
  const breedPreferences = profile?.breedPreferences || {};

  const lookingForLabel = petTypePreferences.length === 0 || petTypePreferences.includes("any")
    ? "Any"
    : petTypePreferences.map((t) => PET_TYPE_LABEL[t] || t).join(", ");

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: 1100 }}>
            <h1 className="text-2xl font-black mb-5" style={{ color: "#3D2B1F" }}>Profile</h1>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map((i) => <div key={i} className="rounded-2xl h-32 animate-pulse" style={{ backgroundColor: "white" }} />)}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile card */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  {/* Banner */}
                  <div style={{ height: 100, backgroundColor: "#FFF3E0" }} />
                  <div className="px-6 pb-6">
                    {/* Avatar */}
                    <div className="relative" style={{ marginTop: -40 }}>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl border-4 border-white"
                        style={{ backgroundColor: "#F5A623" }}>
                        {profile?.photoUrl
                          ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
                          : "😊"
                        }
                      </div>
                    </div>
                    <div className="mt-3 mb-4">
                      <h2 className="text-xl font-black" style={{ color: "#3D2B1F" }}>{displayName}</h2>
                      <p className="text-sm" style={{ color: "#9B8778" }}>
                        {role} · 📍 {location}
                        {dobFormatted && <> · 🎂 {dobFormatted}</>}
                      </p>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-8">
                      {[
                        { value: stats.applications, label: "Applications" },
                        { value: stats.favorites, label: "Favorites" },
                        { value: stats.reports, label: "Reports" },
                        { value: stats.listings, label: "Listings" },
                      ].map((s) => (
                        <div key={s.label}>
                          <p className="text-xl font-black" style={{ color: "#3D2B1F" }}>{s.value}</p>
                          <p className="text-xs" style={{ color: "#9B8778" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Preferences */}
                  <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-base" style={{ color: "#3D2B1F" }}>Preferences</h3>
                      <button onClick={() => navigate("/onboarding?step=preference")} className="text-xs font-bold" style={{ color: "#F5A623" }}>
                        Edit →
                      </button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Looking for", value: lookingForLabel },
                        { label: "Breeds", value: formatBreedSummary(breedPreferences, petTypePreferences) },
                        { label: "Special needs OK?", value: SPECIAL_NEEDS_LABEL[profile?.specialNeedsPreference] || "Doesn't matter" },
                        { label: "Location", value: location },
                      ].map((p) => (
                        <div key={p.label} className="flex items-start justify-between gap-3 py-2"
                          style={{ borderBottom: "1px solid #F5F2EE" }}>
                          <p className="text-sm shrink-0" style={{ color: "#9B8778" }}>{p.label}</p>
                          <p className="text-sm font-bold text-right" style={{ color: "#3D2B1F" }}>{p.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <h3 className="font-black text-base mb-4" style={{ color: "#3D2B1F" }}>Recent activity</h3>
                    {recentActivity.length === 0 ? (
                      <p className="text-sm" style={{ color: "#9B8778" }}>No activity yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map((a, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                              style={{ backgroundColor: a.color }}>
                              {a.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: "#3D2B1F" }}>{a.text}</p>
                              <p className="text-xs" style={{ color: "#9B8778" }}>{timeAgo(a.time)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}