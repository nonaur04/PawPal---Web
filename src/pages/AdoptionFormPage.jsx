import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const GEMINI_API_KEY = "AQ.Ab8RN6Ks7kXkMrAzFR9isZVGdRRDTTwEp0ttZRSDRUWEyRH0LA";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export default function AdoptionFormPage() {
  const { id, petName } = useParams();
  const navigate = useNavigate();
  const name = decodeURIComponent(petName || "this pet");

  const [pet, setPet] = useState(null);
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [userName, setUserName] = useState("");

  const answeredCount = Object.values(answers).filter((a) => a && a.trim() !== "").length;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoadingQuestions(true);
      try {
        const petDoc = await getDoc(doc(db, "pets", id));
        if (!petDoc.exists()) return;
        const petData = { id: petDoc.id, ...petDoc.data() };
        setPet(petData);

        const prompt = `You are a pet adoption screening assistant. Generate exactly 5 screening questions for a potential adopter of this pet.

Pet profile:
- Name: ${petData.name}
- Species: ${petData.species}
- Breed: ${petData.breed}
- Age: ${petData.ageYears > 0 ? petData.ageYears + " years" : petData.ageMonths + " months"}
- Gender: ${petData.gender}
- Personality: ${petData.personality?.join(", ") || "not specified"}
- Vaccinated: ${petData.vaccinated ? "yes" : "no"}
- Neutered: ${petData.neutered ? "yes" : "no"}
- Description: ${petData.description || "not provided"}

Rules:
- Each question must be tailored to this specific pet's personality and needs
- Mix of multiple choice (3 options) and short answer questions
- Include a short AI context tag (3-5 words) explaining why this question matters for this pet
- Return ONLY valid JSON, no markdown, no explanation, no backticks

Return this exact JSON structure:
[
  {
    "id": 1,
    "question": "question text here",
    "context": "short reason tag",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C"]
  },
  {
    "id": 2,
    "question": "question text here",
    "context": "short reason tag",
    "type": "short_answer"
  }
]`;

        const text = await callGemini(prompt);
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setQuestions(parsed);
      } catch (err) {
        console.error("Failed to generate questions:", err);
      } finally {
        setLoadingQuestions(false);
      }
    };
    init();
  }, [id]);

  const handleAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    if (answeredCount < questions.length) return;
    setSubmitting(true);
    try {
      const qaPairs = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? "",
      }));

      const scorePrompt = `You are a pet adoption screening evaluator. Score this adoption application.

Pet profile:
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed}
- Personality: ${pet.personality?.join(", ") || "not specified"}
- Description: ${pet.description || "not provided"}

Applicant's answers:
${qaPairs.map((qa, i) => `Q${i + 1}: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}

Evaluate the applicant's suitability. Return ONLY valid JSON, no markdown, no backticks:
{
  "score": <number 0-100>,
  "recommendation": "<Approve|Review|Reject>",
  "summary": "<2-3 sentence reasoning for the shelter owner>"
}`;

      const scoreText = await callGemini(scorePrompt);
      const scoreClean = scoreText.replace(/```json|```/g, "").trim();
      const result = JSON.parse(scoreClean);
      setAiResult(result);

      await addDoc(collection(db, "applications"), {
        petId: id,
        petName: pet.name,
        applicantId: user?.uid ?? null,
        ownerId: pet.ownerId,
        questions: qaPairs,
        answers,
        aiScore: result.score,
        aiRecommendation: result.recommendation,
        aiSummary: result.summary,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Result screen
  if (submitted && aiResult) {
    const scoreColor = aiResult.score >= 75 ? "#16A34A" : aiResult.score >= 50 ? "#F5A623" : "#EF4444";
    const scoreBg = aiResult.score >= 75 ? "#DCFCE7" : aiResult.score >= 50 ? "#FFF3E0" : "#FEE2E2";

    return (
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
        <Sidebar userName={userName} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="max-w-lg w-full rounded-3xl p-10 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-black mb-2" style={{ color: "#3D2B1F" }}>Application submitted!</h2>
              <p className="text-sm mb-6" style={{ color: "#9B8778" }}>Here's your AI compatibility result</p>
              <div className="rounded-2xl p-6 mb-5" style={{ backgroundColor: scoreBg }}>
                <p className="text-5xl font-black mb-1" style={{ color: scoreColor }}>
                  {aiResult.score}<span className="text-2xl">/100</span>
                </p>
                <p className="font-bold text-sm" style={{ color: scoreColor }}>{aiResult.recommendation}</p>
              </div>
              <p className="text-sm leading-relaxed mb-6 text-left px-2" style={{ color: "#6B5E52" }}>{aiResult.summary}</p>
              <button
                onClick={() => navigate("/home")}
                className="w-full py-3.5 rounded-2xl text-white font-black"
                style={{ backgroundColor: "#F5A623" }}
              >
                Back to discover
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
      <Sidebar userName={userName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-semibold mb-4"
            style={{ color: "#6B5E52" }}
          >
            ‹ Back
          </button>

          <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>
            Adoption screening for {name}
          </h1>
          <p className="text-sm mb-4" style={{ color: "#9B8778" }}>
            Answer all {questions.length} questions below, then submit your application.
          </p>

          {/* Progress bar */}
          <div className="max-w-3xl mb-6">
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#9B8778" }}>
              {answeredCount} of {questions.length} answered
            </p>
            <div className="h-2 rounded-full" style={{ backgroundColor: "#EEE8E0" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: questions.length ? `${(answeredCount / questions.length) * 100}%` : "0%",
                  backgroundColor: "#F5A623",
                }}
              />
            </div>
          </div>

          {loadingQuestions ? (
            <div className="max-w-3xl">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-2xl p-6 mb-4 animate-pulse" style={{ backgroundColor: "white", height: 180 }} />
              ))}
              <p className="text-center text-sm mt-2" style={{ color: "#9B8778" }}>
                ✨ Gemini is generating questions tailored to {name}...
              </p>
            </div>
          ) : (
            <div className="max-w-3xl space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                      style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}
                    >
                      {q.id}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}
                    >
                      ✨ AI · {q.context}
                    </span>
                  </div>

                  <p className="font-black text-base mb-4" style={{ color: "#3D2B1F" }}>{q.question}</p>

                  {q.type === "multiple_choice" && q.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q.id, opt)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-2 text-sm font-semibold text-left transition"
                      style={{
                        border: answers[q.id] === opt ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                        backgroundColor: answers[q.id] === opt ? "#FFF3E0" : "white",
                        color: answers[q.id] === opt ? "#F5A623" : "#6B5E52",
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: answers[q.id] === opt ? "#F5A623" : "#D1C9C0" }}
                      >
                        {answers[q.id] === opt && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F5A623" }} />
                        )}
                      </span>
                      {opt}
                    </button>
                  ))}

                  {q.type === "short_answer" && (
                    <textarea
                      rows={3}
                      placeholder="Type your answer here..."
                      value={answers[q.id] ?? ""}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition"
                      style={{
                        border: answers[q.id] ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                        backgroundColor: "#FAFAFA",
                        color: "#3D2B1F",
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    />
                  )}
                </div>
              ))}

              {questions.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={answeredCount < questions.length || submitting}
                  className="w-full py-4 rounded-2xl text-white font-black text-base transition mt-2"
                  style={{
                    backgroundColor: answeredCount < questions.length ? "#F8C97A" : "#F5A623",
                    cursor: answeredCount < questions.length ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Submitting & scoring..." : `Submit application for ${name}`}
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}