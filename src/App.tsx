import React from "react";
import Navigation from "./components/Navigation";
import OverviewCard from "./components/OverviewCard";
import HistoryList from "./components/HistoryList";
import StatusList from "./components/StatusList";
import { useSimulator } from "./hooks/useSimulator";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { getWeatherLocationLabel } from "./services/weatherService";

const App: React.FC = () => {
  const [automationEnabled, setAutomationEnabled] = useLocalStorage("montagna-automation", true);
  const {
    smartPlugs,
    sensorReadings,
    weather,
    robot,
    irrigationLog,
    cameraAlerts,
    notifications,
    energySummary,
    automationRules,
    securityStatus,
    soilReading,
    weatherSources,
    weatherUpdatedAt,
    togglePlug,
    triggerIrrigation,
    sendRobotCommand,
    simulateAlert,
    weatherNote,
  } = useSimulator({ automationEnabled });

  const deviceDataAvailable = Boolean(import.meta.env.VITE_DEVICES_API_URL);
  const statusTag = "Meteo reale";
  const totalPowerKw = energySummary.totalPowerW / 1000;
  const weatherLocationLabel = getWeatherLocationLabel();
  const soilValueLabel = deviceDataAvailable && soilReading ? `${soilReading.value.toFixed(1)} %` : "N/D";
  const energyValueLabel = deviceDataAvailable ? `${totalPowerKw.toFixed(2)} kW` : "N/D";
  const energyHint = deviceDataAvailable ? `${energySummary.activePlugs} prese ON` : "In attesa API";
  const deviceActionsDisabled = !deviceDataAvailable;
  const automationItems = deviceDataAvailable
    ? automationRules.map((rule) => ({
        label: rule.label,
        detail: rule.detail,
        status: rule.status,
        tone: rule.status === "Attiva" ? "ok" : rule.status === "Rischio" ? "warning" : "neutral",
      }))
    : [
        { label: "Irrigazione mattino", detail: "N/D", status: "N/D", tone: "neutral" },
        { label: "Rientro robot", detail: "N/D", status: "N/D", tone: "neutral" },
        { label: "Antigelo", detail: "N/D", status: "N/D", tone: "neutral" },
      ];
  const irrigationItems = deviceDataAvailable
    ? irrigationLog.slice(0, 3).map((entry) => ({
        label: `${entry.mode} · ${entry.durationMinutes} min`,
        detail: `Umidita finale ${entry.moistureAfter}%`,
        time: entry.timestamp,
      }))
    : [{ label: "N/D", detail: "In attesa API", time: "--" }];
  const cameraItems = deviceDataAvailable
    ? cameraAlerts.map((alert) => ({
        label: alert.type === "person" ? "Persona" : "Movimento",
        detail: alert.message,
        time: alert.time,
        severity: alert.type === "person" ? "warning" : "info",
      }))
    : [{ label: "N/D", detail: "In attesa API", time: "--" }];
  const securityItems = deviceDataAvailable
    ? [
        {
          label: "Perimetro",
          detail: securityStatus.latestAlert
            ? securityStatus.latestAlert.message
            : "Nessun evento nelle ultime ore",
          status: securityStatus.presenceRisk ? "Allerta" : "OK",
          tone: securityStatus.presenceRisk ? "warning" : "ok",
        },
        {
          label: "Gelo",
          detail: securityStatus.freezeRisk ? "Possibile ghiaccio sui camminamenti" : "Condizioni stabili",
          status: securityStatus.freezeRisk ? "Rischio" : "Stabile",
          tone: securityStatus.freezeRisk ? "warning" : "ok",
        },
        {
          label: "Modalita",
          detail: "Meteo in tempo reale da API",
          status: "API",
          tone: "neutral",
        },
      ]
    : [
        { label: "Perimetro", detail: "N/D", status: "N/D", tone: "neutral" },
        { label: "Gelo", detail: "N/D", status: "N/D", tone: "neutral" },
        { label: "Modalita", detail: "In attesa API", status: "N/D", tone: "neutral" },
      ];

  return (
    <div className="relative min-h-screen bg-slate-950 pb-12">
      <Navigation
        automationEnabled={automationEnabled}
        onToggleAutomation={setAutomationEnabled}
      />
      <main className="mx-auto mt-24 max-w-5xl px-4 pb-16">
        <section id="dashboard" className="space-y-2 scroll-mt-28 fade-up">
          <p className="text-xs uppercase tracking-[0.5em] text-sky-300">Dashboard</p>
          <h2 className="text-3xl font-semibold text-white">Controllo terreno & casa</h2>
          <p className="text-sm text-slate-300">
            Tutti i sistemi sotto controllo con meteo reale e automazioni sempre attive.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {statusTag}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 fade-up">
          <OverviewCard title="Meteo" value={`${weather.temperature.toFixed(1)} °C`} hint={weather.condition}>
            <p className="text-xs text-slate-300">Umidita {weather.humidity}% · Pioggia {weather.rainProbability}%</p>
            <p className="pt-2 text-xs text-slate-300">{weatherLocationLabel} · {weatherSources.join(" + ")}</p>
            <p className="pt-1 text-xs text-amber-200">Aggiornato {weatherUpdatedAt}</p>
            <p className="pt-2 text-xs text-sky-200">{weatherNote}</p>
          </OverviewCard>
          <OverviewCard title="Umidità terreno" value={soilValueLabel} hint={deviceDataAvailable ? "Sensore principale" : "In attesa sensori"}>
            <p className="text-xs text-slate-300">
              {deviceDataAvailable ? "L'irrigazione automatica segue questa lettura" : "Dati sensori non disponibili"}
            </p>
          </OverviewCard>
          <OverviewCard title="Energia attiva" value={energyValueLabel} hint={energyHint}>
            {deviceDataAvailable ? (
              <>
                <p className="text-xs text-slate-300">Costo stimato €{energySummary.estimatedDailyCost.toFixed(2)} / giorno</p>
                <p className="pt-2 text-xs text-sky-200">{energySummary.tip}</p>
              </>
            ) : (
              <p className="text-xs text-slate-300">In attesa dati consumo</p>
            )}
          </OverviewCard>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3 fade-up">
          {deviceDataAvailable
            ? smartPlugs.map((plug) => (
                <div key={plug.id} className="card-glow flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-200">{plug.label}</p>
                    <span className={`text-xs ${plug.status === "on" ? "text-emerald-400" : "text-slate-400"}`}>
                      {plug.status === "on" ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-white">{plug.powerW.toFixed(0)} W</p>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Consumo stimato</span>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-3 py-1 text-white backdrop-blur"
                      onClick={() => togglePlug(plug.id)}
                    >
                      {plug.status === "on" ? "Spegni" : "Accendi"}
                    </button>
                  </div>
                </div>
              ))
            : (
              <div className="card-glow flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">Prese smart</p>
                  <span className="text-xs text-slate-400">N/D</span>
                </div>
                <p className="text-2xl font-semibold text-white">N/D</p>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Consumo stimato</span>
                  <button
                    type="button"
                    className="cursor-not-allowed rounded-full border border-white/10 px-3 py-1 text-slate-400"
                    disabled
                  >
                    In attesa API
                  </button>
                </div>
              </div>
            )}
        </section>

        <section id="automazioni" className="mt-6 space-y-4 scroll-mt-28 fade-up">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card-glow col-span-2 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Irrigazione</h3>
                <span className="text-xs text-emerald-300">{automationEnabled ? "Auto" : "Manuale"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-3xl font-semibold text-white">{deviceDataAvailable ? `${soilReading?.value.toFixed(1) ?? "--"}%` : "N/D"}</p>
                <p className="text-xs text-slate-300">umidità attuale</p>
              </div>
              <p className="mt-2 text-xs text-slate-300">Usa la logica pioggia e umidita per anticipare le irrigazioni.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`rounded-2xl bg-sky-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition ${deviceActionsDisabled ? "cursor-not-allowed opacity-60" : "hover:bg-sky-400/90"}`}
                  onClick={() => triggerIrrigation("manual")}
                  disabled={deviceActionsDisabled}
                >
                  Avvia manuale
                </button>
                <button
                  type="button"
                  className={`rounded-2xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition ${deviceActionsDisabled ? "cursor-not-allowed opacity-60" : "hover:border-white"}`}
                  onClick={() => triggerIrrigation("auto")}
                  disabled={deviceActionsDisabled}
                >
                  Test automatica
                </button>
              </div>
            </div>
            <div className="card-glow flex flex-col rounded-2xl p-5">
              <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Robot tagliaerba</h3>
              <p className="mt-2 text-2xl font-semibold text-white">{deviceDataAvailable ? robot.status.toUpperCase() : "N/D"}</p>
              <p className="text-xs text-slate-300">{deviceDataAvailable ? robot.message : "In attesa API"}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                <span>Battery</span>
                <strong className="text-white">{deviceDataAvailable ? `${robot.battery}%` : "N/D"}</strong>
              </div>
              <div className="mt-4 grid gap-2 text-xs">
                <button
                  type="button"
                  className={`rounded-xl bg-emerald-500/80 px-3 py-2 font-semibold uppercase tracking-wider text-white transition ${deviceActionsDisabled ? "cursor-not-allowed opacity-60" : "hover:bg-emerald-400/80"}`}
                  onClick={() => sendRobotCommand("start")}
                  disabled={deviceActionsDisabled}
                >
                  Avvia
                </button>
                <button
                  type="button"
                  className={`rounded-xl border border-white/20 px-3 py-2 font-semibold uppercase tracking-wider text-white transition ${deviceActionsDisabled ? "cursor-not-allowed opacity-60" : "hover:border-white"}`}
                  onClick={() => sendRobotCommand("stop")}
                  disabled={deviceActionsDisabled}
                >
                  Ferma
                </button>
                <button
                  type="button"
                  className={`rounded-xl border border-amber-400/60 px-3 py-2 font-semibold uppercase tracking-wider text-amber-200 transition ${deviceActionsDisabled ? "cursor-not-allowed opacity-60" : "hover:border-amber-200"}`}
                  onClick={() => sendRobotCommand("return")}
                  disabled={deviceActionsDisabled}
                >
                  Ritorna base
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-glow rounded-2xl p-5">
              <StatusList title="Regole attive" items={automationItems} />
            </div>
            <div className="card-glow rounded-2xl p-5">
              <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Log irrigazione</h3>
              <HistoryList title="Storico" items={irrigationItems} />
            </div>
          </div>
        </section>

        <section id="telecamere" className="mt-6 grid gap-4 lg:grid-cols-2 scroll-mt-28 fade-up">
          <div className="card-glow rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Telecamere & AI</h3>
              <button
                type="button"
                className={`text-xs uppercase tracking-wider ${deviceActionsDisabled ? "cursor-not-allowed text-slate-500" : "text-sky-200"}`}
                onClick={simulateAlert}
                disabled={deviceActionsDisabled}
              >
                Simula rilevamento
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Stream live</p>
              <p className="mt-2 text-sm text-slate-200">YooSee placeholder · pronta per embed RTSP/WebRTC</p>
              <div className="mt-3 h-32 rounded-xl border border-dashed border-white/20 bg-slate-900/60" />
            </div>
            <div className="mt-4">
              <StatusList
                title="Sicurezza"
                items={securityItems}
              />
            </div>
          </div>
          <div className="card-glow rounded-2xl p-5">
            <HistoryList title="Alert recenti" items={cameraItems} />
          </div>
        </section>

        <section id="sensori" className="mt-6 grid gap-4 lg:grid-cols-2 scroll-mt-28 fade-up">
          <div className="card-glow min-h-[220px] rounded-2xl p-5">
            <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Sensori live</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sensorReadings.map((reading) => (
                <div
                  key={reading.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200"
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">{reading.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {deviceDataAvailable ? `${reading.value.toFixed(1)} ${reading.unit}` : "N/D"}
                  </p>
                  <p className="text-[0.6rem] text-slate-400">
                    {reading.type === "soil" ? "Terreno" : "Ambiente"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="card-glow min-h-[220px] rounded-2xl p-5">
            <h3 className="text-sm uppercase tracking-[0.4em] text-slate-200">Notifiche</h3>
            <div className="mt-4 space-y-3">
              {deviceDataAvailable ? (
                <>
                  {notifications.length === 0 && <p className="text-xs text-slate-400">Nessuna notifica recente</p>}
                  {notifications.map((note) => (
                    <div key={note.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                      <p className="text-sm text-white">{note.message}</p>
                      <span className="text-[0.6rem] text-slate-400">{note.time}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-slate-400">N/D</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
