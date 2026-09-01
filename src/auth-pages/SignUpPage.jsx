import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase/firebase";

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current }) {
  const steps = ["Details", "Documents", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: done ? "#F5A623" : active ? "#FFF3E0" : "#F5F2EE",
                border: active ? "2px solid #F5A623" : done ? "none" : "2px solid #EEE8E0",
                fontSize: 13, fontWeight: 900,
                color: done ? "white" : active ? "#F5A623" : "#9B8778",
              }}>
                {done ? "✓" : idx}
              </div>
              <span style={{ fontSize: 13, fontWeight: active || done ? 900 : 500, color: active ? "#3D2B1F" : done ? "#F5A623" : "#9B8778" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, backgroundColor: done ? "#F5A623" : "#EEE8E0", margin: "0 10px" }} />
            )}
          </div>
        );
      })}
      <span style={{ fontSize: 12, color: "#9B8778", marginLeft: 12, flexShrink: 0 }}>Step {current} of 3</span>
    </div>
  );
}

// ── Document row ─────────────────────────────────────────────────────────────
function DocRow({ label, desc, fileType, file, onUpload, optional, multiple }) {
  const fileCount = multiple ? (file ? file.length : 0) : (file ? 1 : 0);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", borderBottom: "1px solid #F5F2EE" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>📄</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: "#3D2B1F", marginBottom: 3 }}>
          {label}{optional && <span style={{ fontWeight: 500, color: "#9B8778" }}> · optional</span>}
        </p>
        <p style={{ fontSize: 12, color: "#9B8778", marginBottom: 2 }}>{desc}</p>
        <p style={{ fontSize: 11, color: "#B0A090" }}>{fileType}</p>
        {fileCount > 0 && (
          <p style={{ fontSize: 11, color: "#F5A623", marginTop: 3 }}>
            ✓ {multiple ? `${fileCount} file${fileCount > 1 ? "s" : ""} selected` : file.name}
          </p>
        )}
      </div>
      <label style={{ flexShrink: 0 }}>
        <span style={{ display: "inline-block", padding: "8px 18px", borderRadius: 10, border: "1.5px solid #F5A623", color: "#F5A623", fontSize: 13, fontWeight: 700, cursor: "pointer", backgroundColor: "white" }}>
          {fileCount > 0 ? "Change" : "Upload"}
        </span>
        <input
          type="file"
          multiple={multiple}
          style={{ display: "none" }}
          onChange={(e) => onUpload(multiple ? e.target.files : e.target.files[0])}
        />
      </label>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #EEE8E0",
  backgroundColor: "#FAFAFA", fontSize: 14, fontFamily: "'Nunito', sans-serif",
  color: "#3D2B1F", outline: "none", boxSizing: "border-box",
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = role select, 2 = pet lover form, shelter step 1, 3 = shelter docs, 4 = shelter done
  const [role, setRole] = useState("petlover");

  // Pet Lover fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Shelter step 1
  const [orgName, setOrgName] = useState("");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [shelterEmail, setShelterEmail] = useState("");
  const [shelterPassword, setShelterPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Shelter step 2
  const [ssmNumber, setSsmNumber] = useState("");
  const [ssmCert, setSsmCert] = useState(null);
  const [premisePhotos, setPremisePhotos] = useState(null);
  const [dvsLicence, setDvsLicence] = useState(null);
  const [vetLetter, setVetLetter] = useState(null);
  const [otherDocs, setOtherDocs] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedAt, setSubmittedAt] = useState(null);
  const [shelterUid, setShelterUid] = useState(null);

  // ── Pet Lover sign up ─────────────────────────────────────────────────────
  const handlePetLoverSignUp = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: name.trim(), email: email.trim(), role: "petlover",
        createdAt: serverTimestamp(), onboardingCompleted: false,
      });
      navigate("/home");
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally { setLoading(false); }
  };

  // ── Shelter step 1 → step 2 ───────────────────────────────────────────────
  const handleShelterStep1 = () => {
    if (!orgName.trim()) { setError("Please enter your shelter name."); return; }
    if (!location.trim()) { setError("Please enter your location."); return; }
    if (!contactName.trim()) { setError("Please enter your name."); return; }
    if (!shelterEmail.trim()) { setError("Please enter your email."); return; }
    if (shelterPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!agreedTerms) { setError("Please agree to the Terms and Pet Welfare Pledge."); return; }
    setError("");
    setStep(3); // shelter docs
  };

  // ── Shelter step 2 → submit ───────────────────────────────────────────────
  const handleShelterSubmit = async () => {
    if (!ssmNumber.trim()) { setError("Please enter your SSM number."); return; }
    setLoading(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, shelterEmail, shelterPassword);
      const uid = cred.user.uid;
      setShelterUid(uid);

      // Upload documents
      const uploadFile = async (file, path) => {
        if (!file) return null;
        // FileList (multiple files)
        if (file instanceof FileList || (file && file.length !== undefined && !(file instanceof File))) {
          const urls = [];
          for (let i = 0; i < file.length; i++) {
            const f = file[i];
            const storageRef = ref(storage, `shelter_docs/${uid}/${path}_${i}_${f.name}`);
            await uploadBytes(storageRef, f);
            urls.push(await getDownloadURL(storageRef));
          }
          return urls;
        }
        // Single file
        const storageRef = ref(storage, `shelter_docs/${uid}/${path}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      };

      const [ssmCertUrl, premiseUrl, dvsUrl, vetUrl, otherUrl] = await Promise.all([
        uploadFile(ssmCert, "ssm_cert"),
        uploadFile(premisePhotos, "premise"),
        uploadFile(dvsLicence, "dvs"),
        uploadFile(vetLetter, "vet_letter"),
        uploadFile(otherDocs, "other"),
      ]);

      const now = new Date();
      setSubmittedAt(now);

      await setDoc(doc(db, "users", uid), {
        orgName: orgName.trim(),
        fullName: contactName.trim(),
        email: shelterEmail.trim(),
        location: location.trim(),
        ssmNumber: ssmNumber.trim(),
        role: "shelter",
        verificationStatus: "pending",
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        documents: {
          ssmCert: ssmCertUrl,
          premisePhotos: premiseUrl,
          dvsLicence: dvsUrl,
          vetLetter: vetUrl,
          otherDocs: otherUrl,
        },
      });

      setStep(4); // done
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally { setLoading(false); }
  };

  // ── STEP 1: Role selection ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px 36px", width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#3D2B1F", marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: "#9B8778", marginBottom: 28 }}>Choose how you'll use PawPal</p>

          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <button onClick={() => setRole("petlover")} style={{ flex: 1, padding: "24px 16px", borderRadius: 16, cursor: "pointer", textAlign: "center", transition: "all 0.15s", backgroundColor: role === "petlover" ? "#FFF3E0" : "white", border: role === "petlover" ? "2px solid #F5A623" : "1.5px solid #EEE8E0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
              <p style={{ fontSize: 15, fontWeight: 900, color: role === "petlover" ? "#F5A623" : "#3D2B1F", marginBottom: 4 }}>Pet Lover</p>
              <p style={{ fontSize: 12, color: "#9B8778" }}>Adopt &amp; rehome pets</p>
            </button>
            <button onClick={() => setRole("shelter")} style={{ flex: 1, padding: "24px 16px", borderRadius: 16, cursor: "pointer", textAlign: "center", transition: "all 0.15s", backgroundColor: role === "shelter" ? "#FFF3E0" : "white", border: role === "shelter" ? "2px solid #F5A623" : "1.5px solid #EEE8E0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
              <p style={{ fontSize: 15, fontWeight: 900, color: role === "shelter" ? "#F5A623" : "#3D2B1F", marginBottom: 4 }}>Shelter</p>
              <p style={{ fontSize: 12, color: "#9B8778" }}>Manage &amp; list animals</p>
            </button>
          </div>

          {role === "shelter" && (
            <div style={{ backgroundColor: "#FFF8EC", border: "1.5px solid #FDDFA0", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: "#F5A623", marginBottom: 6 }}>Shelters are verified before going public</p>
              <p style={{ fontSize: 12, color: "#9B8778", lineHeight: 1.6 }}>Registration is two steps: your organization details, then your documents (SSM, premise photos, licences). A PawPal admin reviews them — usually within 48 hours — and you can track the status from your portal.</p>
            </div>
          )}

          <button onClick={() => setStep(role === "shelter" ? 2 : "pl")} style={{ width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: "#F5A623", color: "white", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
            {role === "shelter" ? "Register my shelter →" : "Get started →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#9B8778", marginTop: 18 }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/")} style={{ color: "#F5A623", fontWeight: 900, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Sign in</button>
          </p>
        </div>
      </div>
    );
  }

  // ── Pet Lover form ────────────────────────────────────────────────────────
  if (step === "pl") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px 36px", width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <button onClick={() => { setStep(1); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8778", fontSize: 13, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: "'Nunito', sans-serif" }}>‹ Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>🐾</span>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#3D2B1F" }}>Create your account</h1>
          </div>
          <p style={{ fontSize: 13, color: "#9B8778", marginBottom: 24 }}>Join PawPal as a Pet Lover</p>
          {error && <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#6B5E52", display: "block", marginBottom: 6 }}>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nur Aisyah" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#6B5E52", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#6B5E52", display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#6B5E52", display: "block", marginBottom: 6 }}>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" style={inputStyle} />
            </div>
            <button onClick={handlePetLoverSignUp} disabled={loading} style={{ width: "100%", padding: "14px 0", borderRadius: 14, backgroundColor: loading ? "#F8C97A" : "#F5A623", color: "white", fontWeight: 900, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "#9B8778", marginTop: 18 }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/")} style={{ color: "#F5A623", fontWeight: 900, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Sign in</button>
          </p>
        </div>
      </div>
    );
  }

  // ── SHELTER STEP 2: Organization details ──────────────────────────────────
  if (step === 2) {
    const canContinue = orgName.trim() && location.trim() && contactName.trim() && shelterEmail.trim() && shelterPassword.length >= 8 && agreedTerms;
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px 36px", width: 460, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <Stepper current={1} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#3D2B1F", marginBottom: 4 }}>Organization details</h1>
          <p style={{ fontSize: 13, color: "#F5A623", marginBottom: 24, fontWeight: 600 }}>Tell us who you are. Documents come next.</p>
          {error && <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Organization name</label>
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Melaka Animal Haven" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ayer Keroh, Melaka" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Your name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Liyana Afiera" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Email</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9B8778", fontSize: 14 }}>✉</span>
                <input type="email" value={shelterEmail} onChange={(e) => setShelterEmail(e.target.value)} placeholder="you@shelter.org" style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9B8778", fontSize: 14 }}>🔒</span>
                <input type="password" value={shelterPassword} onChange={(e) => setShelterPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
            </div>

            {/* Terms checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#F5A623" }} />
              <span style={{ fontSize: 12, color: "#6B5E52" }}>
                I agree to PawPal's{" "}
                <span style={{ color: "#F5A623", fontWeight: 700 }}>Terms</span>
                {" "}and{" "}
                <span style={{ color: "#F5A623", fontWeight: 700 }}>Pet Welfare Pledge</span>.
              </span>
            </label>

            <button onClick={handleShelterStep1} style={{ width: "100%", padding: "14px 0", borderRadius: 14, backgroundColor: canContinue ? "#F5A623" : "#F8C97A", color: "white", fontWeight: 900, fontSize: 15, border: "none", cursor: canContinue ? "pointer" : "not-allowed", marginTop: 4 }}>
              Continue to documents →
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#9B8778", marginTop: -4 }}>Fill in every field (password 8+ characters) to continue</p>
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "#9B8778", marginTop: 16 }}>
            Already registered?{" "}
            <button onClick={() => navigate("/")} style={{ color: "#F5A623", fontWeight: 900, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Sign in</button>
          </p>
        </div>
      </div>
    );
  }

  // ── SHELTER STEP 3: Documents ─────────────────────────────────────────────
  if (step === 3) {
    const canSubmit = ssmNumber.trim();
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px 36px", width: 460, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <Stepper current={2} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#3D2B1F", marginBottom: 4 }}>Verification documents</h1>
          <p style={{ fontSize: 13, color: "#9B8778", marginBottom: 24 }}>
            For <span style={{ fontWeight: 900, color: "#3D2B1F" }}>{orgName || "your shelter"}</span> · required unless marked optional
          </p>
          {error && <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {/* SSM number */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#3D2B1F", display: "block", marginBottom: 6 }}>Registration / SSM number</label>
            <input value={ssmNumber} onChange={(e) => setSsmNumber(e.target.value)} placeholder="e.g. 202301045678" style={inputStyle} />
          </div>

          {/* Document rows */}
          <DocRow label="SSM registration certificate" desc="Company/society registration from SSM or ROS" fileType="PDF or image" file={ssmCert} onUpload={setSsmCert} />
          <DocRow label="Premise photos" desc="At least 4 photos: kennels, quarantine area, entrance, feeding area" fileType="Images, min 4" file={premisePhotos} onUpload={setPremisePhotos} multiple />
          <DocRow label="DVS animal facility licence" desc="Licence from the Department of Veterinary Services" fileType="PDF or image" file={dvsLicence} onUpload={setDvsLicence} />
          <DocRow label="Vet partnership letter" desc="Signed letter from your attending veterinarian" fileType="PDF" file={vetLetter} onUpload={setVetLetter} />
          <DocRow label="Other supporting documents" desc="Tenancy agreement, insurance, awards — anything that helps" fileType="Any file" file={otherDocs} onUpload={setOtherDocs} optional multiple />

          {/* Privacy note */}
          <div style={{ backgroundColor: "#F5F2EE", borderRadius: 12, padding: "12px 14px", margin: "20px 0", fontSize: 12, color: "#9B8778" }}>
            🔒 Documents are visible only to PawPal admins during review.
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => { setStep(2); setError(""); }} style={{ padding: "14px 20px", borderRadius: 14, backgroundColor: "white", border: "1.5px solid #EEE8E0", color: "#6B5E52", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              ← Back
            </button>
            <button onClick={handleShelterSubmit} disabled={loading || !canSubmit} style={{ flex: 1, padding: "14px 0", borderRadius: 14, backgroundColor: canSubmit && !loading ? "#F5A623" : "#F8C97A", color: "white", fontWeight: 900, fontSize: 14, border: "none", cursor: canSubmit && !loading ? "pointer" : "not-allowed" }}>
              {loading ? "Submitting..." : "Submit for verification"}
            </button>
          </div>
          {!canSubmit && <p style={{ textAlign: "center", fontSize: 12, color: "#9B8778", marginTop: 8 }}>Enter your registration number</p>}
        </div>
      </div>
    );
  }

  // ── SHELTER STEP 4: Done ──────────────────────────────────────────────────
  if (step === 4) {
    const submitted = submittedAt ? submittedAt.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px 36px", width: 460, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <Stepper current={3} />

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#3D2B1F", marginBottom: 10 }}>Sent to PawPal admins</h1>
            <p style={{ fontSize: 14, color: "#9B8778", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 900, color: "#3D2B1F" }}>{orgName}</span> is in the verification queue. Reviews usually finish within 48 hours.
            </p>
          </div>

          {/* Details card */}
          <div style={{ backgroundColor: "#F5F2EE", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            {[
              { label: "Submitted", value: submitted },
              { label: "Review target", value: "Within 48 hours" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #EEE8E0" }}>
                <span style={{ fontSize: 13, color: "#9B8778" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#3D2B1F" }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* While you wait note */}
          <div style={{ backgroundColor: "#FFF8EC", border: "1.5px solid #FDDFA0", borderRadius: 14, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#9B8778", lineHeight: 1.6 }}>
            <span style={{ fontWeight: 900, color: "#F5A623" }}>While you wait:</span> you can sign in and explore PawPal, but they are features that will be available once your shelter is approved.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => navigate("/shelter/dashboard")} style={{ width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: "#F5A623", color: "white", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
              Go to my shelter portal
            </button>
            <button onClick={() => navigate("/")} style={{ width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: "white", border: "1.5px solid #EEE8E0", color: "#6B5E52", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}