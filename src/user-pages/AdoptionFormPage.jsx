import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const GROQ_API_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(prompt) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content ?? "";
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
- Generate exactly 5 questions: 3 must be multiple choice (with 3 options each) and 2 must be short answer
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

        const text = await callGroq(prompt);
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

      const scoreText = await callGroq(scorePrompt);
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

  if (submitted && aiResult) {
    const score = aiResult.score;
    const scoreColor = score >= 75 ? "#F5A623" : score >= 50 ? "#F5A623" : "#EF4444";
    const label = score >= 75 ? "Good Fit" : score >= 50 ? "Possible Fit" : "Low Match";
    const circumference = 2 * Math.PI * 54;
    const filled = circumference - (circumference * score) / 100;

    return (
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F2EE", fontFamily: "'Nunito', sans-serif" }}>
        <Sidebar userName={userName} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 flex items-start justify-center pt-10">
            <div className="mx-auto w-full" style={{ maxWidth: 1100 }}>
              <div className="max-w-lg w-full mx-auto rounded-3xl p-8 text-center" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>

                {/* Party icon */}
                <div className="text-5xl mb-4">🎉</div>

                <h2 className="text-2xl font-black mb-2" style={{ color: "#3D2B1F" }}>Application submitted!</h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: "#9B8778" }}>
                  {pet?.ownerId ? "The shelter" : "The owner"} has received your application for {name}.<br />
                  Here's your AI suitability score:
                </p>

                {/* Score card */}
                <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: "#FFF8F0" }}>
                  {/* Circular score */}
                  <div className="flex items-center justify-center mb-4">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {/* Background circle */}
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#EEE8E0" strokeWidth="10" />
                      {/* Score arc */}
                      <circle
                        cx="70" cy="70" r="54"
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={filled}
                        transform="rotate(-90 70 70)"
                      />
                      {/* Score number */}
                      <text x="70" y="65" textAnchor="middle" dominantBaseline="middle"
                        style={{ fontSize: 32, fontWeight: 900, fill: "#3D2B1F", fontFamily: "'Nunito', sans-serif" }}>
                        {score}
                      </text>
                      <text x="70" y="88" textAnchor="middle"
                        style={{ fontSize: 13, fill: "#9B8778", fontFamily: "'Nunito', sans-serif" }}>
                        /100
                      </text>
                    </svg>
                  </div>

                  <p className="text-xl font-black mb-2" style={{ color: "#3D2B1F" }}>{label}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B5E52" }}>{aiResult.summary}</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/home")}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition"
                    style={{ border: "1.5px solid #EEE8E0", color: "#6B5E52", backgroundColor: "white" }}
                  >
                    Back to discover
                  </button>
                  <button
                    onClick={() => navigate("/messages")}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition"
                    style={{ backgroundColor: "#F5A623" }}
                  >
                    Message shelter
                  </button>
                </div>
              </div>
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
          <div className="mx-auto" style={{ maxWidth: 1100 }}>

            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: "#6B5E52" }}>
              ‹ Back
            </button>

            <h1 className="text-2xl font-black mb-1" style={{ color: "#3D2B1F" }}>
              Adoption screening for {name}
            </h1>
            <p className="text-sm mb-4" style={{ color: "#9B8778" }}>
              Answer all {questions.length} questions below, then submit your application.
            </p>

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
                  ✨ AI is generating questions tailored to {name}...
                </p>
              </div>
            ) : (
              <div className="max-w-3xl space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-2xl p-6" style={{ backgroundColor: "white", border: "1px solid #EEE8E0" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                        style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>
                        {q.id}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: "#FFF3E0", color: "#F5A623" }}>
                        ✨ AI · {q.context}
                      </span>
                    </div>

                    <p className="font-black text-base mb-4" style={{ color: "#3D2B1F" }}>{q.question}</p>

                    {q.type === "multiple_choice" && q.options?.map((opt) => (
                      <button key={opt} onClick={() => handleAnswer(q.id, opt)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-2 text-sm font-semibold text-left transition"
                        style={{
                          border: answers[q.id] === opt ? "1.5px solid #F5A623" : "1.5px solid #EEE8E0",
                          backgroundColor: answers[q.id] === opt ? "#FFF3E0" : "white",
                          color: answers[q.id] === opt ? "#F5A623" : "#6B5E52",
                        }}>
                        <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: answers[q.id] === opt ? "#F5A623" : "#D1C9C0" }}>
                          {answers[q.id] === opt && (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F5A623" }} />
                          )}
                        </span>
                        {opt}
                      </button>
                    ))}

                    {q.type === "short_answer" && (
                      <textarea rows={3} placeholder="Type your answer here..."
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
                  <button onClick={handleSubmit}
                    disabled={answeredCount < questions.length || submitting}
                    className="w-full py-4 rounded-2xl text-white font-black text-base transition mt-2"
                    style={{
                      backgroundColor: answeredCount < questions.length ? "#F8C97A" : "#F5A623",
                      cursor: answeredCount < questions.length ? "not-allowed" : "pointer",
                    }}>
                    {submitting ? "Submitting & scoring..." : `Submit application for ${name}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}