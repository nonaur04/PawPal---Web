import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import BrandingPanel from "../components/BrandingPanel";
import {
  STATE_LIST,
  MALAYSIA_STATES,
  DAYS,
  MONTHS,
  YEARS,
  PET_TYPES,
  BREED_OPTIONS,
  BREED_STEP_TYPES,
} from "../data/onboardingData";

const ORANGE = "#F5A623";
const DARK = "#3D2B1F";
const MUTED = "#9B8778";
const FIELD_BG = "#F4F1EC";

// ---------- Shared bits ----------

function ProgressDots({ total, current }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: 56,
            backgroundColor: i <= current ? ORANGE : "#EAE3D8",
          }}
        />
      ))}
    </div>
  );
}

function BackArrow({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 text-2xl"
      style={{ color: DARK }}
      aria-label="Back"
    >
      ←
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-white font-bold py-4 rounded-full transition text-base"
      style={{
        backgroundColor: disabled ? "#F8C97A" : ORANGE,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

function PillOption({ label, emoji, selected, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 transition ${className}`}
      style={{
        borderColor: selected ? ORANGE : "#EAE3D8",
        backgroundColor: selected ? "#FFF8EE" : FIELD_BG,
      }}
    >
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span
        className="font-bold text-sm"
        style={{ color: selected ? ORANGE : DARK }}
      >
        {label}
      </span>
    </button>
  );
}

function BreedChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-2.5 rounded-full border-2 font-semibold text-sm transition"
      style={{
        borderColor: selected ? ORANGE : "#D9D2C7",
        backgroundColor: selected ? "#FFF3DD" : FIELD_BG,
        color: selected ? ORANGE : "#6B5E52",
      }}
    >
      {label}
    </button>
  );
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none appearance-none"
      style={{ backgroundColor: FIELD_BG, color: value ? DARK : "#B0A696" }}
    >
      <option value="" disabled hidden style={{ backgroundColor: "white", color: "#B0A696" }}>
        {placeholder}
      </option>
      {options.map((opt) =>
        typeof opt === "string" ? (
          <option key={opt} value={opt} style={{ backgroundColor: "white", color: "#1a1a1a" }}>
            {opt}
          </option>
        ) : (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: "white", color: "#1a1a1a" }}>
            {opt.label}
          </option>
        )
      )}
    </select>
  );
}

// ---------- Step 1: Profile ----------

function ProfileStep({ data, setData, onNext, onSkip }) {
  const cityOptions = data.state ? MALAYSIA_STATES[data.state] || [] : [];

  return (
    <div>
      <ProgressDots total={2} current={0} />
      <h1
        className="text-3xl font-black mb-2"
        style={{ color: DARK, fontFamily: "'Nunito', sans-serif" }}
      >
        Complete your profile 🐾
      </h1>
      <p className="text-sm mb-8" style={{ color: MUTED }}>
        Help us get to know you better
      </p>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: FIELD_BG }}
          >
            {data.photoPreview ? (
              <img src={data.photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="44" height="44" viewBox="0 0 24 24" fill={DARK}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            )}
          </div>
          <label
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: ORANGE }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M9 2L7.2 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.2L15 2H9zm3 15c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setData((d) => ({
                    ...d,
                    photoFile: file,
                    photoPreview: URL.createObjectURL(file),
                  }));
                }
              }}
            />
          </label>
        </div>
        <p className="text-sm font-semibold mt-3" style={{ color: ORANGE }}>
          Add photo (optional)
        </p>
      </div>

      <div className="space-y-5">
        {/* Phone */}
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: DARK }}>
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="01X-XXXXXXX"
            value={data.phone}
            onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none placeholder-gray-400"
            style={{ backgroundColor: FIELD_BG, color: DARK }}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: DARK }}>
            Gender
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "male", label: "Male", symbol: "♂" },
              { key: "female", label: "Female", symbol: "♀" },
              { key: "prefer_not", label: "Prefer not", symbol: "—" },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setData((d) => ({ ...d, gender: g.key }))}
                className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition"
                style={{
                  borderColor: data.gender === g.key ? ORANGE : "#EAE3D8",
                  backgroundColor: data.gender === g.key ? "#FFF8EE" : FIELD_BG,
                }}
              >
                <span className="text-lg" style={{ color: data.gender === g.key ? ORANGE : "#6B5E52" }}>
                  {g.symbol}
                </span>
                <span
                  className="font-bold text-sm"
                  style={{ color: data.gender === g.key ? ORANGE : "#6B5E52" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location: State + City */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: DARK }}>
            Location
          </label>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              value={data.state}
              onChange={(e) =>
                setData((d) => ({ ...d, state: e.target.value, city: "" }))
              }
              options={STATE_LIST}
              placeholder="State"
            />
            <SelectField
              value={data.city}
              onChange={(e) => setData((d) => ({ ...d, city: e.target.value }))}
              options={cityOptions}
              placeholder="City"
            />
          </div>
        </div>

        {/* Date of birth */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: DARK }}>
            Date of Birth
          </label>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={data.dobDay}
              onChange={(e) => setData((d) => ({ ...d, dobDay: e.target.value }))}
              className="w-full rounded-xl px-3 py-3.5 text-sm font-medium outline-none appearance-none text-center"
              style={{ backgroundColor: FIELD_BG, color: data.dobDay ? DARK : "#B0A696" }}
            >
              <option value="" disabled hidden style={{ backgroundColor: "white", color: "#B0A696" }}>Day</option>
              {DAYS.map((d) => (
                <option key={d} value={d} style={{ backgroundColor: "white", color: "#1a1a1a" }}>{d}</option>
              ))}
            </select>
            <SelectField
              value={data.dobMonth}
              onChange={(e) => setData((d) => ({ ...d, dobMonth: e.target.value }))}
              options={MONTHS}
              placeholder="Month"
            />
            <select
              value={data.dobYear}
              onChange={(e) => setData((d) => ({ ...d, dobYear: e.target.value }))}
              className="w-full rounded-xl px-3 py-3.5 text-sm font-medium outline-none appearance-none text-center"
              style={{ backgroundColor: FIELD_BG, color: data.dobYear ? DARK : "#B0A696" }}
            >
              <option value="" disabled hidden style={{ backgroundColor: "white", color: "#B0A696" }}>Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y} style={{ backgroundColor: "white", color: "#1a1a1a" }}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onNext}>Next</PrimaryButton>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm font-semibold mt-4"
          style={{ color: MUTED }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ---------- Step 2: Pet Preference ----------

function PetPreferenceStep({ data, setData, onNext, onBack }) {
  const togglePetType = (key) => {
    setData((d) => {
      let types = d.petTypes.includes(key)
        ? d.petTypes.filter((t) => t !== key)
        : [...d.petTypes, key];

      // "Any" is exclusive
      if (key === "any") {
        types = d.petTypes.includes("any") ? [] : ["any"];
      } else {
        types = types.filter((t) => t !== "any");
      }
      return { ...d, petTypes: types };
    });
  };

  return (
    <div>
      <BackArrow onClick={onBack} />
      <ProgressDots total={2} current={1} />
      <h1
        className="text-3xl font-black mb-2"
        style={{ color: DARK, fontFamily: "'Nunito', sans-serif" }}
      >
        Your pet preference 🐶🐱
      </h1>
      <p className="text-sm mb-8" style={{ color: MUTED }}>
        Help us find the perfect match for you
      </p>

      <div className="mb-8">
        <h3 className="font-bold text-base mb-1" style={{ color: DARK }}>
          What type of pet are you looking for?
        </h3>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          You can select multiple
        </p>
        <div className="grid grid-cols-3 gap-3">
          {PET_TYPES.map((t) => (
            <PillOption
              key={t.key}
              label={t.label}
              emoji={t.emoji}
              selected={data.petTypes.includes(t.key)}
              onClick={() => togglePetType(t.key)}
            />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-base mb-1" style={{ color: DARK }}>
          Are you okay with special needs pets?
        </h3>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          e.g. disabled, chronic illness, requires medication
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "yes", label: "Yes 💛" },
            { key: "no", label: "No" },
            { key: "doesnt_matter", label: "Doesn't matter" },
          ].map((o) => (
            <PillOption
              key={o.key}
              label={o.label}
              selected={data.specialNeeds === o.key}
              onClick={() => setData((d) => ({ ...d, specialNeeds: o.key }))}
            />
          ))}
        </div>
      </div>

      <PrimaryButton onClick={onNext} disabled={data.petTypes.length === 0}>
        {data.petTypes.some((t) => BREED_STEP_TYPES.includes(t)) ? "Next" : "Let's go! 🐾"}
      </PrimaryButton>
    </div>
  );
}

// ---------- Step 3+: Breed Preference (one per selected pet type) ----------

function BreedPreferenceStep({ petType, totalSteps, currentStep, selected, onToggleBreed, onNoPreference, onNext, onBack, isLast }) {
  const config = BREED_OPTIONS[petType];

  return (
    <div>
      <BackArrow onClick={onBack} />
      <ProgressDots total={totalSteps} current={currentStep} />

      <div className="text-4xl mb-3">{config.emoji}</div>
      <h1
        className="text-2xl font-black mb-2"
        style={{ color: DARK, fontFamily: "'Nunito', sans-serif" }}
      >
        {config.title}
      </h1>
      <p className="text-sm mb-6" style={{ color: MUTED }}>
        Select all that apply
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        {config.breeds.map((breed) => (
          <BreedChip
            key={breed}
            label={breed}
            selected={selected.includes(breed)}
            onClick={() => onToggleBreed(breed)}
          />
        ))}
      </div>

      <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
        {isLast ? "Let's go! 🐾" : "Next"}
      </PrimaryButton>
      <button
        onClick={onNoPreference}
        className="w-full text-center text-sm font-semibold mt-4"
        style={{ color: MUTED }}
      >
        No preference — show me all
      </button>
    </div>
  );
}

// ---------- Main orchestrator ----------

export default function OnboardingPage() {
  const navigate = useNavigate();

  // "profile" -> "pet_preference" -> "breed:<type>" (one per selected type, in order) -> done
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    photoFile: null,
    photoPreview: null,
    phone: "",
    gender: "",
    state: "",
    city: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    petTypes: [],
    specialNeeds: "",
    breedPreferences: {}, // { dogs: [...], cats: [...] }
  });

  // Build the ordered list of breed steps based on selected pet types (selection order preserved)
  const breedSteps = data.petTypes.filter((t) => BREED_STEP_TYPES.includes(t));

  // step 0 = profile, step 1 = pet preference, step 2..n = breed steps
  const TOTAL_STEPS = 2 + breedSteps.length;

  const finishOnboarding = async (finalData) => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          phone: finalData.phone || null,
          gender: finalData.gender || null,
          state: finalData.state || null,
          city: finalData.city || null,
          dateOfBirth:
            finalData.dobDay && finalData.dobMonth && finalData.dobYear
              ? `${finalData.dobYear}-${finalData.dobMonth}-${finalData.dobDay}`
              : null,
          petTypePreferences: finalData.petTypes,
          specialNeedsPreference: finalData.specialNeeds || null,
          breedPreferences: finalData.breedPreferences,
          onboardingCompleted: true,
        });
      }
    } catch (err) {
      console.error("Failed to save onboarding data:", err);
    } finally {
      setSaving(false);
      navigate("/home");
    }
  };

  // ---- Step 0: Profile ----
  if (stepIndex === 0) {
    return (
      <PageShell>
        <ProfileStep
          data={data}
          setData={setData}
          onNext={() => setStepIndex(1)}
          onSkip={() => setStepIndex(1)}
        />
      </PageShell>
    );
  }

  // ---- Step 1: Pet preference ----
  if (stepIndex === 1) {
    return (
      <PageShell>
        <PetPreferenceStep
          data={data}
          setData={setData}
          onBack={() => setStepIndex(0)}
          onNext={() => {
            if (breedSteps.length === 0) {
              finishOnboarding(data);
            } else {
              setStepIndex(2);
            }
          }}
        />
      </PageShell>
    );
  }

  // ---- Step 2..n: Breed preference, one screen per selected type ----
  const breedStepPosition = stepIndex - 2; // 0-indexed within breedSteps
  const currentPetType = breedSteps[breedStepPosition];

  if (currentPetType) {
    const isLast = breedStepPosition === breedSteps.length - 1;
    const selected = data.breedPreferences[currentPetType] || [];

    const toggleBreed = (breed) => {
      setData((d) => {
        const current = d.breedPreferences[currentPetType] || [];
        const next = current.includes(breed)
          ? current.filter((b) => b !== breed)
          : [...current, breed];
        return {
          ...d,
          breedPreferences: { ...d.breedPreferences, [currentPetType]: next },
        };
      });
    };

    const setNoPreference = () => {
      const updated = {
        ...data,
        breedPreferences: { ...data.breedPreferences, [currentPetType]: ["Any"] },
      };
      setData(updated);
      if (isLast) {
        finishOnboarding(updated);
      } else {
        setStepIndex((s) => s + 1);
      }
    };

    const goNext = () => {
      if (isLast) {
        finishOnboarding(data);
      } else {
        setStepIndex((s) => s + 1);
      }
    };

    const goBack = () => {
      if (breedStepPosition === 0) {
        setStepIndex(1);
      } else {
        setStepIndex((s) => s - 1);
      }
    };

    return (
      <PageShell>
        <BreedPreferenceStep
          petType={currentPetType}
          totalSteps={TOTAL_STEPS}
          currentStep={stepIndex}
          selected={selected}
          onToggleBreed={toggleBreed}
          onNoPreference={setNoPreference}
          onNext={goNext}
          onBack={goBack}
          isLast={isLast}
        />
      </PageShell>
    );
  }

  // Fallback (shouldn't normally reach here)
  return (
    <PageShell>
      <p style={{ color: DARK }}>
        {saving ? "Saving your preferences..." : "Loading..."}
      </p>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <BrandingPanel variant="register" />
      <div className="flex-1 flex items-start justify-center overflow-y-auto bg-white px-10 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}