const SYSTEM_PROMPT = "Sei un assistente per una dashboard di casa/terreno in montagna. Rispondi in italiano con suggerimenti pratici, chiari e brevi. Se la richiesta non riguarda la dashboard, rispondi comunque con cortesia.";

const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
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
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text || "AI error" }), {
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
