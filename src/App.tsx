import React, { useMemo } from "react";
import Navigation from "./components/Navigation";
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

  const cards: Array<{ key: SectionKey; title: string; emoji: string; value: string; note: string }> = [
    {
      key: "meteo",
      title: "Meteo",
      emoji: weather.rainProbability > 60 ? "🌧️" : "☀️",
      value: `${weather.temperature.toFixed(1)}°C`,
      note: `${todaySummary} · ${todayDetail}`,
    },
    {
      key: "energia",
      title: "Energia",
      emoji: "🔋",
      value: deviceDataAvailable ? `${(energySummary.totalPowerW / 1000).toFixed(2)} kW` : "N/D",
      note: deviceDataAvailable ? `${energySummary.activePlugs} prese attive` : "N/D",
    },
    {
      key: "automazioni",
      title: "Automazioni",
      emoji: "💧",
      value: deviceDataAvailable ? (automationEnabled ? "Auto" : "Manuale") : "N/D",
      note: deviceDataAvailable ? "Irrigazione + robot" : "N/D",
    },
    {
      key: "telecamere",
      title: "Telecamere",
      emoji: "📷",
      value: deviceDataAvailable ? (securityStatus.presenceRisk ? "Allerta" : "OK") : "N/D",
      note: deviceDataAvailable ? "Perimetro e alert" : "N/D",
    },
    {
      key: "sensori",
      title: "Sensori",
      emoji: "🛰️",
      value: deviceDataAvailable ? `${sensorReadings.length}` : "N/D",
      note: deviceDataAvailable ? "Terreno + aria" : "N/D",
    },
    {
      key: "notifiche",
      title: "Notifiche",
      emoji: "🔔",
      value: deviceDataAvailable ? "OK" : "N/D",
      note: deviceDataAvailable ? "Eventi recenti" : "N/D",
    },
  ];


  return (
    <div className="relative min-h-screen pb-16">
      <Navigation
        automationEnabled={automationEnabled}
        onToggleAutomation={setAutomationEnabled}
      />
      <main className="mx-auto mt-24 max-w-4xl px-5 pb-16">
        <section className="space-y-4 fade-up">
          <div className="wood-banner">{todayLabel.toUpperCase()} · {weather.temperature.toFixed(1)}°C</div>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-emerald-100">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            {todayLabel} · {getWeatherLocationLabel()}
          </div>
        </section>

        <section className="mt-6 grid gap-10 sm:grid-cols-2 fade-up">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              className="wood-card aspect-square p-5 text-left transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-amber-950 underline decoration-amber-700/70 underline-offset-4">
                  {card.title}
                </h3>
                <span className="wood-icon" aria-hidden="true">{card.emoji}</span>
              </div>
              <div className="mt-4 text-amber-950">
                <p className="text-3xl font-semibold">{card.value}</p>
                <div className="mt-2 h-px w-full bg-amber-900/40" />
                <p className="mt-3 text-sm font-medium text-amber-900/80">{card.note}</p>
              </div>
              {card.key === "meteo" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-900/90">
                  <span className="text-lg">⚠️</span>
                  <span>{weatherAlert}</span>
                </div>
              )}
            </button>
          ))}
        </section>

        <section className="mt-8 fade-up">
          <div className="wood-pill">UN DATO CHE POTREBBE INTERESSARE</div>
        </section>
      </main>
    </div>
  );
};

export default App;