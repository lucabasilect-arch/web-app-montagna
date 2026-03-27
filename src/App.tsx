import React, { useMemo } from "react";
import { useSimulator } from "./hooks/useSimulator";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getWeatherLocationLabel } from "./services/weatherService";

type SectionKey = "meteo" | "energia" | "automazioni" | "telecamere" | "sensori" | "notifiche";

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


  return (
    <div className="relative min-h-screen pb-16">
      <main className="mx-auto mt-12 max-w-5xl px-5 pb-16">
        <section className="space-y-4 fade-up">
          <div className="wood-banner">{todayLabel.toUpperCase()} · {weather.temperature.toFixed(1)}°C</div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-[20px] fade-up">
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
      </main>
    </div>
  );
};

export default App;