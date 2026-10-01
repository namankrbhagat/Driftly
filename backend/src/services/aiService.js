const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiError = require("../utils/ApiError");

const MODELS_TO_TRY = Array.from(new Set([
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash"
])).filter(Boolean);

let genAI = null;
const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key") {
    throw new ApiError("GEMINI API Key is not configured on the server", 503);
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
};

const extractJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);

  if (start === -1) throw new ApiError("AI returned an unexpected response", 502);
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    throw new ApiError("AI returned an invalid JSON response", 502);
  }
};

const runPrompt = async (prompt) => {
  const instance = getGenAI();
  let lastError = null;

  for (const modelName of MODELS_TO_TRY) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const model = instance.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        if (error.isApiError) throw error;
        lastError = error;
        const status = error.status || error.statusCode;

        const is503 = status === 503 ||
          (error.message && (
            error.message.includes("503") ||
            error.message.toLowerCase().includes("high demand") ||
            error.message.toLowerCase().includes("service unavailable")
          ));

        if (is503 && attempt < 3) {
          console.warn(`Gemini model '${modelName}' 503 high demand (attempt ${attempt}/3). Retrying in 1s...`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const isNotFound = status === 404 ||
          (error.message && (error.message.includes("404") || error.message.toLowerCase().includes("not found")));

        if (isNotFound) {
          console.warn(`Gemini model '${modelName}' not found, trying next fallback model...`);
          break; // Break attempt loop to try next model in outer loop
        }

        if (status === 429) {
          throw new ApiError("AI quota exceeded. Check your Gemini plan/billing and try again later", 429);
        }
        if (status === 400 || status === 401 || status === 403) {
          throw new ApiError(`AI request rejected: ${error.message || "verify API key"}`, 503);
        }
        break;
      }
    }
  }

  console.error("Gemini request failed:", lastError?.message || lastError);
  throw new ApiError(`AI service error: ${lastError?.message || "temporarily unavailable"}`, 502);
};

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
const normalizeTask = (t) => ({
  title: String(t.title || t.name || "").trim().slice(0, 200),
  description: String(t.description || "").trim().slice(0, 1000),
  priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : "medium",
});

const generateTasks = async (goal, count = 6) => {
  const prompt = `You are a senior project manager. Break the following project into ${count} concrete, actionable Kanban tasks.
  Goal: "${goal}"
  
  Respond ONLY with a JSON array. Each item: {"title":string, "description":string(1-2 sentences), "priority":"low"|"medium"|"high"|"urgent"}
  No markdown,No commentary`;
  
  const json = extractJson(await runPrompt(prompt));
  if (!Array.isArray(json)) throw new ApiError("AI response is not an array.", 502);
  return json.map(normalizeTask).filter((t) => t.title);
};

const breakdownTask = async (title, description = "", count = 5) => {
  const prompt = `Break the following task into ${count} smaller, sequential subtasks.
  Task title: "${title}"
  Task details: "${description || "n/a"}"
  
  Respond ONLY with a JSON array. Each item: {"title":string, "description": string (short), "priority":"low"|"medium"|"high"|"urgent"}.
  No markdown, no commentary.`;

  const json = extractJson(await runPrompt(prompt));
  if (!Array.isArray(json)) throw new ApiError("AI response is not an array.", 502);
  return json.map(normalizeTask).filter((t) => t.title);
};

const summarizeBoard = async ({ boardTitle, columns }) => {
  const snapshot = columns.map((c) =>
    `${c.title} (${c.tasks.length}):\n` +
    (c.tasks.map((t) => `- ${t.title} [${t.priority}]`).join("\n") || "   (none)")
  )
  .join("\n");

  const prompt = `You are a scrum master. Write a concise sprint summary for the Kanban board "${boardTitle}".
  Current board state:
  ${snapshot}
  
  Respond ONLY with JSON: {
  "headline": string (one sentence overview),
  "completed": string[] (key done items),
  "inProgress":string[] (what's actively being worked),
  "risks":string[] (blockers/risks/overdue concerns),
  "recommendations": string[] (next priorities)
  }
  No markdown, no commentary.`;

  return extractJson(await runPrompt(prompt));
};

module.exports = { generateTasks, breakdownTask, summarizeBoard };