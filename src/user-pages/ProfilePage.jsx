import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const SPECIES_BG = { dog: "#F9BFBF", cat: "#F9BFBF", rabbit: "#F2C4A0", bird: "#C4E0F2", others: "#D4F2C4" };
const SPECIES_EMOJI = { dog: "🐕", cat: "🐱", rabbit: "🐇", bird: "🦜", others: "🐾" };

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

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ applications: 0, favorites: 0, reports: 0, listings: 0 });
  const [favoritePets, setFavoritePets] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [preferences, setPreferences] = useState({});

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
        setPreferences(profileData.preferences || {});

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

  const displayName = profile?.name || profile?.displayName || userName || "User";
  const role = profile?.role === "shelter" ? "Shelter" : "Pet Adopter";
  const location = preferences?.location || profile?.location || "Melaka, Malaysia";

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
                      <p className="text-sm" style={{ color: "#9B8778" }}>{role} · {location}</p>
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

                {/* Favorite pets */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-base flex items-center gap-2" style={{ color: "#3D2B1F" }}>
                      🤍 Favorite pets
                    </h3>
                    <button onClick={() => navigate("/home")} className="text-sm font-bold" style={{ color: "#F5A623" }}>
                      Browse more →
                    </button>
                  </div>
                  {favoritePets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <p className="text-3xl mb-2">🤍</p>
                      <p className="font-black text-sm mb-1" style={{ color: "#3D2B1F" }}>No favourites yet</p>
                      <p className="text-xs" style={{ color: "#9B8778" }}>Tap the heart on any pet to save them here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {favoritePets.map((pet) => {
                        const bg = SPECIES_BG[pet.species?.toLowerCase()] ?? "#F9BFBF";
                        const emoji = SPECIES_EMOJI[pet.species?.toLowerCase()] ?? "🐾";
                        return (
                          <div key={pet.id} onClick={() => navigate(`/pet/${pet.id}`)}
                            className="rounded-xl overflow-hidden cursor-pointer hover:shadow-sm transition"
                            style={{ border: "1px solid #EEE8E0" }}>
                            <div className="relative flex items-center justify-center"
                              style={{ height: 100, backgroundColor: bg, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)" }}>
                              {pet.photoUrls?.[0]
                                ? <img src={pet.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                                : <span style={{ fontSize: 40 }}>{emoji}</span>
                              }
                              <span className="absolute top-2 right-2 text-base">🤍</span>
                            </div>
                            <div className="p-2.5">
                              <p className="font-black text-sm" style={{ color: "#3D2B1F" }}>{pet.name}</p>
                              <p className="text-xs" style={{ color: "#9B8778" }}>{pet.breed} · {formatAge(pet.ageYears, pet.ageMonths)}</p>
                              <p className="text-xs flex items-center gap-0.5 mt-0.5" style={{ color: "#9B8778" }}>
                                📍 {pet.address?.split(",")[0]}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Preferences */}
                  <div className="rounded-2xl p-5" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <h3 className="font-black text-base mb-4" style={{ color: "#3D2B1F" }}>Preferences</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Looking for", value: preferences?.species || preferences?.petType || "Cats" },
                        { label: "Breeds", value: preferences?.breeds?.join(", ") || preferences?.breed || "Any" },
                        { label: "Location", value: location },
                      ].map((p) => (
                        <div key={p.label} className="flex items-center justify-between py-2"
                          style={{ borderBottom: "1px solid #F5F2EE" }}>
                          <p className="text-sm" style={{ color: "#9B8778" }}>{p.label}</p>
                          <p className="text-sm font-bold" style={{ color: "#3D2B1F" }}>{p.value}</p>
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