import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../auth-pages/adminConfig";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Admin is decided purely by email — no Firestore role needed
      if (isAdmin(userCredential.user.email)) {
        navigate("/admin");
        return;
      }

      const uid = userCredential.user.uid;

      // Fetch role from Firestore
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        setError("Account not found. Please register first.");
        return;
      }

      const role = userDoc.data().role;

      if (role === "shelter") {
        navigate("/shelter/dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white px-6 sm:px-10 py-12">
      <div className="w-full max-w-sm">

        {/* Heading */}
        <h2
          className="text-4xl font-black text-gray-900 mb-1"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Welcome back 👋
        </h2>
        <p className="text-sm text-gray-400 mb-8">Sign in to continue</p>

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 7l10 7 10-7"/>
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition placeholder-gray-300"
                style={{ "--tw-ring-color": "#F5A623" }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-16 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition placeholder-gray-300"
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
            {/* Forgot password */}
            <div className="flex justify-end mt-1.5">
              <a
                href="/forgot-password"
                className="text-xs font-semibold"
                style={{ color: "#F5A623" }}
              >
                Forgot password?
              </a>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3.5 rounded-xl transition text-sm mt-1"
            style={{
              backgroundColor: loading ? "#F8C97A" : "#F5A623",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-sm text-gray-400 mt-6">
          New to PawPal?{" "}
          <a
            href="/register"
            className="font-bold"
            style={{ color: "#F5A623" }}
          >
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}