import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type FunFactState = {
  date: string;
  text: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const typedWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return typedWindow.SpeechRecognition || typedWindow.webkitSpeechRecognition || null;
};

const fallbackFacts = [
  "In inverno, tieni le tubazioni isolate: il gelo puo bloccare l'acqua in poche ore.",
  "Dopo una nevicata, libera il tetto a falde: il peso della neve bagnata cresce rapidamente.",
  "Una stufa a legna ben tirata riduce condensa e muffa nei locali chiusi di montagna.",
  "Piccole prese d'aria nei locali tecnici evitano accumuli di umidita e gelo.",
  "Le batterie dei sensori calano con il freddo: controllale prima dei periodi di gelo.",
  "Il sale antigelo e utile sui vialetti, ma evita di usarlo vicino a piante delicate.",
];

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFallbackFact = (dateKey: string) => {
  const numeric = Number(dateKey.replace(/-/g, ""));
  const index = Number.isNaN(numeric) ? 0 : numeric % fallbackFacts.length;
  return fallbackFacts[index];
};

const isCompleteSentence = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 20) {
    return false;
  }
  return /[.!?]$/.test(trimmed);
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
  const [chatListening, setChatListening] = useState(false);
  const [funFactState, setFunFactState] = useLocalStorage<FunFactState>("montagna-fun-fact", {
    date: "",
    text: "",
  });
  const [funFactPending, setFunFactPending] = useState(false);
  const [funFactError, setFunFactError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
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

  useEffect(() => {
    if (!chatScrollRef.current) {
      return;
    }
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, chatPending]);

  const normalizeAiError = (error: unknown) => {
    const fallback = "Errore AI";
    if (!error) {
      return fallback;
    }
    const raw = error instanceof Error ? error.message : String(error);
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      // Keep raw message when it's not JSON.
    }
    return raw || fallback;
  };

  const refreshFunFact = useCallback(
    async (force = false) => {
      const todayKey = getLocalDateKey();
      const fallbackFact = getFallbackFact(todayKey);
      if (!force && funFactState.date === todayKey && isCompleteSentence(funFactState.text)) {
        return;
      }
      if (funFactPending) {
        return;
      }
      setFunFactPending(true);
      setFunFactError(null);
      try {
        const response = await fetch("/api/fun-fact", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Errore fun fact");
        }

        const data = await response.json();
        const rawFact = String(data?.fact ?? data?.reply ?? "").replace(/\s+/g, " ").trim();
        const cleanedFact = rawFact.replace(/^"|"$/g, "");
        const finalFact = cleanedFact || fallbackFact;
        setFunFactState({ date: todayKey, text: finalFact });
      } catch (error) {
        setFunFactError(null);
        setFunFactState({ date: todayKey, text: fallbackFact });
      } finally {
        setFunFactPending(false);
      }
    },
    [funFactPending, funFactState.date, funFactState.text, setFunFactState]
  );

  useEffect(() => {
    refreshFunFact(false);
  }, [refreshFunFact]);

  useEffect(() => {
    let timeoutId = 0;
    const scheduleRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const delay = nextMidnight.getTime() - now.getTime();
      timeoutId = window.setTimeout(async () => {
        await refreshFunFact(true);
        scheduleRefresh();
      }, delay);
    };
    scheduleRefresh();
    return () => window.clearTimeout(timeoutId);
  }, [refreshFunFact]);

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
      const errorMessage = normalizeAiError(error);
      setChatError(`Assistente non disponibile: ${errorMessage}`);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Non riesco a rispondere ora. Riprova tra poco.", time: formatTime() },
      ]);
    } finally {
      setChatPending(false);
    }
  };

  const handleVoiceInput = () => {
    if (chatListening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setChatError("Dettatura vocale non disponibile su questo dispositivo.");
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "it-IT";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setChatError("Errore durante la dettatura vocale.");
    };
    recognition.onend = () => {
      setChatListening(false);
      recognitionRef.current = null;
    };
    setChatError(null);
    setChatListening(true);
    recognition.start();
  };


  return (
    <div className="relative min-h-screen pb-40">
      <main className="mx-auto mt-12 max-w-5xl px-5 pb-20">
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
              <div className="wood-pill fun-fact-pill">
                <div className="fun-fact-title">UN DATO CHE POTREBBE INTERESSARE</div>
                <div className="fun-fact-body">
                  <span className="fun-fact-icon">💡</span>
                  <p key={`${funFactState.date}-${funFactState.text.slice(0, 12)}`} className="fun-fact-text fade-up">
                    {funFactPending && !funFactState.text
                      ? "Sto preparando il dato di oggi..."
                      : funFactState.text || getFallbackFact(getLocalDateKey())}
                  </p>
                </div>
              </div>
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
              <div ref={chatScrollRef} className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
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
            <form className="wood-card p-3" onSubmit={handleSendMessage}>
              <div className="flex h-[44px] items-center gap-2 rounded-2xl border border-amber-900/30 bg-white/80 px-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Scrivi una domanda..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-amber-950 placeholder-amber-900/50 outline-none"
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={chatPending}
                  className={`voice-button flex h-8 w-8 items-center justify-center rounded-full border border-amber-900/20 text-base ${
                    chatListening ? "bg-amber-300/90 voice-button--listening" : "bg-amber-100/70"
                  } text-amber-900 disabled:opacity-60`}
                  aria-label={chatListening ? "Interrompi dettatura" : "Dettatura vocale"}
                  aria-pressed={chatListening}
                >
                  {chatListening ? "⏺️" : "🎙️"}
                </button>
                {chatListening && <span className="voice-rec">REC</span>}
                <button
                  type="submit"
                  disabled={chatPending}
                  className="h-8 shrink-0 rounded-full bg-amber-800 px-4 text-[0.65rem] font-semibold uppercase tracking-wider text-white disabled:opacity-60"
                >
                  {chatPending ? "Attendi" : "Invia"}
                </button>
              </div>
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