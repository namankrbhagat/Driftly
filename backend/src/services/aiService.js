const { GoogleGenerativeAI } = require("@google/generative-ai");
const ApiError = require("../utils/ApiError");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

let genAI = null;
const getModel = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key") {
    throw new ApiError("GEMINI API Key is not configured on the server", 503);
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({ model: MODEL });
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
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    if (error.isApiError) throw error;
    console.error("Gemini request failed:", error.message || error);
    const status = error.status || error.statusCode;
    if (status === 429) {
      throw new ApiError("AI quota exceeded. Check your Gemini plan/billing and try again later", 429);
    }
    if (status === 400 || status === 401 || status === 403) {
      throw new ApiError(`AI request rejected: ${error.message || "verify API key and model"}`, 503);
    }

    throw new ApiError(`AI service error: ${error.message || "temporarily unavailable"}`, 502);
  }
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