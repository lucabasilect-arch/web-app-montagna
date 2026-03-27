const SYSTEM_PROMPT = "Sei un assistente per una dashboard di casa/terreno in montagna. Rispondi in italiano con suggerimenti pratici, chiari e brevi. Se la richiesta non riguarda la dashboard, rispondi comunque con cortesia.";

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

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...normalized,
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text || "AI error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = String(data?.choices?.[0]?.message?.content ?? "Risposta non disponibile").trim();

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
