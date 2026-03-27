import React, { useMemo, useState } from "react";
import { useSimulator } from "./hooks/useSimulator";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getWeatherLocationLabel } from "./services/weatherService";

type SectionKey = "meteo" | "energia" | "automazioni" | "telecamere" | "sensori" | "notifiche";
type TabKey = "home" | "ai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  time: string;
};

const App: React.FC = () => {
  const [automationEnabled, setAutomationEnabled] = useLocalStorage("montagna-automation", true);
  const {
    sensorReadings,
    weather,
    energySummary,
    securityStatus,
    weatherForecast,
  } = useSimulator({ automationEnabled });

  const deviceDataAvailable = Boolean(import.meta.env.VITE_DEVICES_API_URL);
  const forecastDays = weatherForecast.days ?? [];
  const todayForecast = forecastDays[0];
  const todaySummary = todayForecast
    ? `${Math.round(todayForecast.max)}° / ${Math.round(todayForecast.min)}°`
    : `${weather.temperature.toFixed(1)} °C`;
  const todayDetail = todayForecast?.condition ?? weather.condition;
  const weatherAlert = weather.rainProbability > 60 ? "Allerta gialla temporali!" : "Nessuna allerta meteo";
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" }),
    []
  );

  const formatTime = () =>
    new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ciao! Posso aiutarti con meteo, automazioni e report per la tua casa in montagna.",
      time: formatTime(),
    },
  ]);

  const getWeatherIcon = (condition: string, rainProbability: number) => {
    const normalized = condition.toLowerCase();
    if (normalized.includes("tempor")) return "⛈️";
    if (normalized.includes("neve") || normalized.includes("snow")) return "❄️";
    if (normalized.includes("nebb")) return "🌫️";
    if (normalized.includes("piogg") || normalized.includes("rovesc") || rainProbability > 70) return "🌧️";
    if (normalized.includes("nuvol")) return "⛅";
    return "☀️";
  };

  const accentByKey: Record<SectionKey, { border: string; iconBg: string; iconBorder: string; iconColor: string }> = {
    meteo: { border: "#4f8dd9", iconBg: "rgba(207, 227, 255, 0.8)", iconBorder: "#3a6fb6", iconColor: "#1f3b63" },
    energia: { border: "#4aa65f", iconBg: "rgba(210, 242, 218, 0.8)", iconBorder: "#2f7a42", iconColor: "#1f4a2d" },
    automazioni: { border: "#3b6ee8", iconBg: "rgba(206, 219, 255, 0.85)", iconBorder: "#264aad", iconColor: "#20306d" },
    telecamere: { border: "#7a6f66", iconBg: "rgba(227, 219, 212, 0.85)", iconBorder: "#584d44", iconColor: "#3b2f27" },
    sensori: { border: "#d8a62e", iconBg: "rgba(255, 236, 191, 0.9)", iconBorder: "#a97912", iconColor: "#6a4a10" },
    notifiche: { border: "#c23b3b", iconBg: "rgba(255, 214, 214, 0.9)", iconBorder: "#8e2424", iconColor: "#5a1414" },
  };

  const cards: Array<{ key: SectionKey; title: string; emoji: string; value: string; secondary?: string; tertiary?: string }> = [
    {
      key: "meteo",
      title: "Meteo",
      emoji: getWeatherIcon(weather.condition, weather.rainProbability),
      value: `${weather.temperature.toFixed(1)}°C`,
      secondary: todaySummary,
      tertiary: todayDetail,
    },
    {
      key: "energia",
      title: "Energia",
      emoji: "🔋",
      value: deviceDataAvailable ? `${(energySummary.totalPowerW / 1000).toFixed(2)} kW` : "N/D",
      secondary: deviceDataAvailable ? `${energySummary.activePlugs} prese attive` : "N/D",
    },
    {
      key: "automazioni",
      title: "Automazioni",
      emoji: "💧",
      value: deviceDataAvailable ? (automationEnabled ? "Auto" : "Manuale") : "N/D",
      secondary: deviceDataAvailable ? "Irrigazione + robot" : "N/D",
    },
    {
      key: "telecamere",
      title: "Telecamere",
      emoji: "📷",
      value: deviceDataAvailable ? (securityStatus.presenceRisk ? "Allerta" : "OK") : "N/D",
      secondary: deviceDataAvailable ? "Perimetro e alert" : "N/D",
    },
    {
      key: "sensori",
      title: "Notifiche",
      emoji: "🔔",
      value: deviceDataAvailable ? "OK" : "N/D",
      secondary: deviceDataAvailable ? "Eventi recenti" : "N/D",
    },
    {
      key: "notifiche",
      title: "Problemi",
      emoji: "⚠️",
      value: deviceDataAvailable && securityStatus.presenceRisk ? "Allerta" : "N/D",
      secondary: deviceDataAvailable ? "Eventi critici" : "N/D",
    },
  ];

  const handleSendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatPending) {
      return;
    }
    const userMessage: ChatMessage = { role: "user", content: trimmed, time: formatTime() };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatPending(true);
    setChatError(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-8).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Errore AI");
      }

      const data = await response.json();
      const reply = String(data?.reply ?? "Risposta non disponibile");
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply, time: formatTime() }]);
    } catch (error) {
      setChatError("Assistente non disponibile: controlla le chiavi AI su Cloudflare.");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Non riesco a rispondere ora. Riprova tra poco.", time: formatTime() },
      ]);
    } finally {
      setChatPending(false);
    }
  };


  return (
    <div className="relative min-h-screen pb-28">
      <main className="mx-auto mt-12 max-w-5xl px-5 pb-16">
        {activeTab === "home" ? (
          <>
            <section className="space-y-4 fade-up">
              <div className="wood-banner">{todayLabel.toUpperCase()} · {weather.temperature.toFixed(1)}°C</div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-5 fade-up">
              {cards.map((card) => {
                const accent = accentByKey[card.key];
                const iconStyle: React.CSSProperties = {
                  "--icon-bg": accent.iconBg,
                  "--icon-border": accent.iconBorder,
                  "--icon-color": accent.iconColor,
                } as React.CSSProperties;
                const cardStyle: React.CSSProperties = {
                  borderColor: accent.border,
                };
                return (
                  <button
                    key={card.key}
                    type="button"
                    className="wood-card aspect-square p-5 text-left transition"
                    style={cardStyle}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-amber-950 underline decoration-amber-700/70 underline-offset-4">
                        {card.title}
                      </h3>
                      <span className="wood-icon" style={iconStyle} aria-hidden="true">{card.emoji}</span>
                    </div>
                    <div className="mt-4 text-amber-950">
                      <p className="text-4xl font-semibold">{card.value}</p>
                      <div className="mt-2 h-px w-full bg-amber-900/40" />
                      {card.secondary && (
                        <p className="mt-3 text-base font-medium text-amber-900/80">{card.secondary}</p>
                      )}
                      {card.tertiary && (
                        <p className="mt-1 text-sm font-medium text-amber-900/60">{card.tertiary}</p>
                      )}
                    </div>
                    {card.key === "meteo" && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-900/90">
                        <span className="text-lg">⚠️</span>
                        <span>{weatherAlert}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </section>

            <section className="mt-8 fade-up">
              <div className="wood-pill">UN DATO CHE POTREBBE INTERESSARE</div>
            </section>
          </>
        ) : (
          <section className="space-y-4 fade-up">
            <div className="wood-banner">ASSISTENTE IA</div>
            <div className="wood-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-amber-950">Chat operativa</h3>
                <span className="wood-icon" aria-hidden="true">🤖</span>
              </div>
              <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`chat-bubble ${message.role === "user" ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
                      <p>{message.content}</p>
                      <span className="chat-time">{message.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form className="wood-card flex flex-wrap items-center gap-3 p-4" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Scrivi una domanda..."
                className="flex-1 h-11 rounded-xl border border-amber-900/30 bg-white/80 px-3 text-sm text-amber-950 placeholder-amber-900/50"
              />
              <button
                type="submit"
                disabled={chatPending}
                className="rounded-xl bg-amber-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-60"
              >
                {chatPending ? "Attendi" : "Invia"}
              </button>
            </form>
            {chatError && <p className="text-xs text-red-100">{chatError}</p>}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navigazione inferiore">
        <button
          type="button"
          className={`bottom-nav__item ${activeTab === "home" ? "is-active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          🏠 Home
        </button>
        <button
          type="button"
          className={`bottom-nav__item ${activeTab === "ai" ? "is-active" : ""}`}
          onClick={() => setActiveTab("ai")}
        >
          🤖 IA
        </button>
      </nav>
    </div>
  );
};

export default App;