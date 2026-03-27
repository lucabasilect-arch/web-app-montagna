const SYSTEM_PROMPT = "Sei un assistente per una dashboard di casa/terreno in montagna. Rispondi in italiano con suggerimenti pratici, chiari e brevi. Se la richiesta non riguarda la dashboard, rispondi comunque con cortesia.";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash-latest";
const FALLBACK_GEMINI_MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
];

let cachedAvailableModels = null;

const buildGeminiUrl = (modelName, apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

const buildGeminiModelsUrl = (apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

const getGeminiError = (text) => {
  if (!text) {
    return { message: "AI error", status: null };
  }
  try {
    const parsed = JSON.parse(text);
    const status = parsed?.error?.status ?? null;
    const message = parsed?.error?.message ?? text;
    return { message, status };
  } catch {
    return { message: text, status: null };
  }
};

const shouldRetryModel = (error) => {
  if (!error) {
    return false;
  }
  if (error.status === "NOT_FOUND") {
    return true;
  }
  const message = String(error.message || "").toLowerCase();
  return message.includes("not found") || message.includes("not supported for generatecontent");
};

const fetchAvailableModels = async (apiKey) => {
  if (cachedAvailableModels) {
    return cachedAvailableModels;
  }
  const response = await fetch(buildGeminiModelsUrl(apiKey));
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  const available = models
    .filter((model) => Array.isArray(model?.supportedGenerationMethods))
    .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
    .map((model) => String(model?.name || ""))
    .filter(Boolean)
    .map((name) => name.replace(/^models\//, ""))
    .filter(Boolean);
  cachedAvailableModels = available.length ? available : null;
  return cachedAvailableModels;
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const payload = await request.json();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const normalized = messages
      .filter((item) => typeof item?.content === "string")
      .map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: String(item.content).slice(0, 2000),
      }))
      .slice(-8);

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const modelName = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const modelsToTry = [
      modelName,
      ...FALLBACK_GEMINI_MODELS.filter((model) => model !== modelName),
    ];

    let response = null;
    let lastError = null;
    let triedAvailableModels = false;

    for (let index = 0; index < modelsToTry.length; index += 1) {
      const model = modelsToTry[index];
      response = await fetch(buildGeminiUrl(model, env.GEMINI_API_KEY), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: normalized.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400,
          },
        }),
      });

      if (response.ok) {
        break;
      }

      const text = await response.text();
      lastError = getGeminiError(text || "AI error");
      if (!shouldRetryModel(lastError)) {
        break;
      }

      if (!triedAvailableModels && index === modelsToTry.length - 1) {
        triedAvailableModels = true;
        const availableModels = await fetchAvailableModels(env.GEMINI_API_KEY);
        if (Array.isArray(availableModels)) {
          for (const availableModel of availableModels) {
            if (!modelsToTry.includes(availableModel)) {
              modelsToTry.push(availableModel);
            }
          }
        }
      }
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: lastError?.message || "AI error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = String(
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        data?.promptFeedback?.blockReasonMessage ??
        "Risposta non disponibile"
    ).trim();

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "AI request failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
