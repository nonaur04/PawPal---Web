import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import BrandingPanel from "../components/BrandingPanel";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("petlover");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pet Lover fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Shelter fields
  const [orgName, setOrgName] = useState("");
  const [ssmNumber, setSsmNumber] = useState("");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [shelterPassword, setShelterPassword] = useState("");
  const [showShelterPassword, setShowShelterPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (role === "petlover") {
      if (!fullName || !email || !password || !confirmPassword) {
        setError("Please fill in all fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      setLoading(true);
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          fullName,
          email,
          role: "petlover",
          createdAt: serverTimestamp(),
        });
        navigate("/home");
      } catch (err) {
        switch (err.code) {
          case "auth/email-already-in-use":
            setError("This email is already registered.");
            break;
          case "auth/invalid-email":
            setError("Invalid email address.");
            break;
          case "auth/weak-password":
            setError("Password must be at least 8 characters.");
            break;
          default:
            setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!orgName || !ssmNumber || !location || !contactName || !workEmail || !shelterPassword) {
        setError("Please fill in all fields.");
        return;
      }
      if (shelterPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      setLoading(true);
      try {
        const userCred = await createUserWithEmailAndPassword(auth, workEmail, shelterPassword);
        await setDoc(doc(db, "users", userCred.user.uid), {
          fullName: contactName,
          email: workEmail,
          role: "shelter",
          orgName,
          ssmNumber,
          location,
          createdAt: serverTimestamp(),
        });
        navigate("/shelter/dashboard");
      } catch (err) {
        switch (err.code) {
          case "auth/email-already-in-use":
            setError("This email is already registered.");
            break;
          case "auth/invalid-email":
            setError("Invalid email address.");
            break;
          case "auth/weak-password":
            setError("Password must be at least 8 characters.");
            break;
          default:
            setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition placeholder-gray-300";

  const FieldIcon = ({ children }) => (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
      {children}
    </span>
  );

  return (
    <div className="h-screen flex overflow-hidden">
      <BrandingPanel variant="register" />

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto bg-white px-10 py-12">
        <div className="w-full max-w-sm">
          <h2
            className="text-4xl font-black text-gray-900 mb-1"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Create your account
          </h2>
          <p className="text-sm text-gray-400 mb-6">Choose how you'll use PawPal</p>

          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { key: "petlover", emoji: "🐾", label: "Pet Lover", sub: "Adopt & rehome pets" },
              { key: "shelter", emoji: "🏠", label: "Shelter", sub: "Manage & list animals" },
            ].map(({ key, emoji, label, sub }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRole(key); setError(""); }}
                className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition"
                style={{
                  borderColor: role === key ? "#F5A623" : "#E5E7EB",
                  backgroundColor: role === key ? "#FFF8EE" : "white",
                }}
              >
                <span className="text-2xl">{emoji}</span>
                <span
                  className="font-bold text-sm"
                  style={{ color: role === key ? "#F5A623" : "#374151" }}
                >
                  {label}
                </span>
                <span className="text-xs text-gray-400">{sub}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {role === "petlover" ? (
              <>
                {/* Full name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-16`}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium"
                      style={{ color: "#F5A623" }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-16`}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium"
                      style={{ color: "#F5A623" }}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Org name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organization name</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M3 21h18M9 21V7l6-4v18M9 11h6"/><rect x="13" y="13" width="2" height="4"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Melaka Animal Haven"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* SSM */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registration / SSM number</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={ssmNumber}
                      onChange={(e) => setSsmNumber(e.target.value)}
                      placeholder="e.g. 202301045678"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Contact name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Work email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work email</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="you@shelter.org"
                      className={inputClass}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                  </div>
                </div>

                {/* Shelter password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <FieldIcon>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type={showShelterPassword ? "text" : "password"}
                      value={shelterPassword}
                      onChange={(e) => setShelterPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-16`}
                      style={{ "--tw-ring-color": "#F5A623" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowShelterPassword(!showShelterPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium"
                      style={{ color: "#F5A623" }}
                    >
                      {showShelterPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-xl transition text-sm mt-1"
              style={{
                backgroundColor: loading ? "#F8C97A" : "#F5A623",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {loading
                ? "Creating account..."
                : role === "petlover"
                ? "Sign up"
                : "Create shelter account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <a href="/" className="font-bold" style={{ color: "#F5A623" }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}