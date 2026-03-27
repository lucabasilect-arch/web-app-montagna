import { useEffect, useMemo, useState } from "react";
import {
  CameraAlert,
  IrrigationLog,
  RobotState,
  SensorReading,
  SmartPlug,
  WeatherReading,
  createCameraAlert,
  createInitialIrrigationLog,
  createInitialPlugs,
  createRobotState,
  createSensorReadings,
  randomWeather,
} from "../services/mockData";
import { fetchWeatherAverage, getWeatherLocationLabel, WeatherForecast } from "../services/weatherService";

type Notification = {
  id: string;
  message: string;
  time: string;
};

type SimulatorOptions = {
  automationEnabled: boolean;
};

export const useSimulator = ({ automationEnabled }: SimulatorOptions) => {
  const [smartPlugs, setSmartPlugs] = useState<SmartPlug[]>(() => createInitialPlugs());
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>(() => createSensorReadings());
  const [weather, setWeather] = useState<WeatherReading>(() => randomWeather());
  const [irrigationLog, setIrrigationLog] = useState<IrrigationLog[]>(() => createInitialIrrigationLog());
  const [robot, setRobot] = useState<RobotState>(() => createRobotState());
  const [cameraAlerts, setCameraAlerts] = useState<CameraAlert[]>(() => [createCameraAlert(0)]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [weatherSources, setWeatherSources] = useState<string[]>(["In caricamento"]);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast>({ days: [] });
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<string>(
    new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );
  const [weatherErrorNotified, setWeatherErrorNotified] = useState(false);

  const pushNotification = (message: string) => {
    const entry: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message,
      time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 5));
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSensorReadings(createSensorReadings());
      setSmartPlugs((prev) =>
        prev.map((plug) => ({
          ...plug,
          powerW:
            plug.status === "on"
              ? parseFloat((60 + Math.random() * 80).toFixed(1))
              : 0,
        }))
      );
      setRobot((prev) => ({
        ...prev,
        battery: Math.max(20, Math.min(100, prev.battery - (prev.status === "charging" ? -1 : 2))),
        message: prev.status === "error" ? "Richiede attenzione" : "Pronto per il prossimo ciclo",
      }));
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      try {
        const { reading, sources, forecast } = await fetchWeatherAverage();
        if (!active) {
          return;
        }
        setWeather(reading);
        setWeatherSources(sources);
        setWeatherForecast(forecast);
        setWeatherUpdatedAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
        if (weatherErrorNotified) {
          setWeatherErrorNotified(false);
        }
      } catch {
        if (!active) {
          return;
        }
        if (!weatherErrorNotified) {
          pushNotification("Errore meteo: uso fallback temporaneo");
          setWeatherErrorNotified(true);
        }
        setWeather(randomWeather());
        setWeatherSources(["Fallback locale"]);
        setWeatherForecast({ days: [] });
        setWeatherUpdatedAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
      }
    };
    loadWeather();
    const interval = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [weatherErrorNotified]);

  const togglePlug = (id: string) => {
    setSmartPlugs((prev) =>
      prev.map((plug) => {
        if (plug.id !== id) {
          return plug;
        }
        const nextStatus = plug.status === "on" ? "off" : "on";
        pushNotification(`${plug.label} ${nextStatus === "on" ? "attivata" : "spenta"}`);
        return {
          ...plug,
          status: nextStatus,
          powerW: nextStatus === "on" ? parseFloat((60 + Math.random() * 90).toFixed(1)) : 0,
        };
      })
    );
  };

  const triggerIrrigation = (mode: "manual" | "auto") => {
    const timestamp = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const duration = mode === "manual" ? 10 : 7 + Math.round(Math.random() * 5);
    const soilReading = sensorReadings.find((reading) => reading.type === "soil");
    const moistureAfter = parseFloat(
      Math.min(95, (soilReading?.value ?? 40) + 12).toFixed(1)
    );
    setIrrigationLog((prev) => [
      {
        timestamp,
        mode,
        durationMinutes: duration,
        moistureAfter,
      },
      ...prev,
    ]);
    setSensorReadings((prev) =>
      prev.map((reading) =>
        reading.type === "soil"
          ? { ...reading, value: Math.min(95, reading.value + 12) }
          : reading
      )
    );
    pushNotification(`Irrigazione ${mode} eseguita (${duration} min)`);
  };

  const sendRobotCommand = (command: "start" | "stop" | "return") => {
    setRobot((prev) => {
      let status: RobotState["status"] = prev.status;
      let message = "Comando accettato";
      if (command === "start") {
        status = "cutting";
        message = "Tagliaerba attivo";
      }
      if (command === "stop") {
        status = "idle";
        message = "Pausa tempo libero";
      }
      if (command === "return") {
        status = "returning";
        message = "Ritorno alla base";
      }
      pushNotification(`Robot: ${message}`);
      return {
        ...prev,
        status,
        message,
        battery: Math.max(15, prev.battery - (command === "return" ? 1 : 3)),
      };
    });
  };

  const simulateAlert = () => {
    setCameraAlerts((prev) => [createCameraAlert(prev.length), ...prev].slice(0, 4));
    pushNotification("Rilevato movimento intorno al terreno");
  };

  const soilReading = sensorReadings.find((reading) => reading.type === "soil");
  const airTemperature = sensorReadings.find((reading) => reading.id === "air-temperature");

  const weatherNote = useMemo(() => {
    if (weatherSources.includes("Fallback locale")) {
      return "Connessione alle API meteo instabile: fallback locale attivo";
    }
    return `Media meteo su ${weatherSources.length} fonti per ${getWeatherLocationLabel()}`;
  }, [weatherSources]);

  const energySummary = useMemo(() => {
    const totalPowerW = smartPlugs.reduce((sum, plug) => sum + plug.powerW, 0);
    const activePlugs = smartPlugs.filter((plug) => plug.status === "on").length;
    const estimatedDailyCost = (totalPowerW / 1000) * 6 * 0.28;
    const tip = totalPowerW > 220
      ? "Picco elevato: valuta fasce orarie e carichi alternati"
      : "Consumi regolari: opportuno mantenere la pianificazione";
    return {
      totalPowerW,
      activePlugs,
      estimatedDailyCost,
      tip,
    };
  }, [smartPlugs]);

  const automationRules = useMemo(() => {
    const soilValue = soilReading?.value ?? 50;
    const rainOk = weather.rainProbability < 60;
    return [
      {
        label: "Irrigazione mattino",
        status: automationEnabled && soilValue < 40 && rainOk ? "Attiva" : "Standby",
        detail: `Umidita ${soilValue.toFixed(1)}% · Pioggia ${weather.rainProbability}%`,
      },
      {
        label: "Rientro robot",
        status: robot.battery < 35 ? "Consigliato" : "OK",
        detail: `Batteria ${robot.battery}%`,
      },
      {
        label: "Antigelo",
        status: (airTemperature?.value ?? 6) < 2 ? "Rischio" : "Stabile",
        detail: `Temperatura ${airTemperature?.value?.toFixed(1) ?? "--"}°C`,
      },
    ];
  }, [airTemperature, automationEnabled, robot.battery, soilReading, weather.rainProbability]);

  const securityStatus = useMemo(() => {
    const latestAlert = cameraAlerts[0];
    const freezeRisk = (airTemperature?.value ?? 6) < 2;
    return {
      freezeRisk,
      latestAlert,
      presenceRisk: latestAlert?.type === "person",
    };
  }, [airTemperature, cameraAlerts]);

  return {
    smartPlugs,
    sensorReadings,
    weather,
    irrigationLog,
    robot,
    cameraAlerts,
    automationEnabled,
    notifications,
    energySummary,
    automationRules,
    securityStatus,
    soilReading,
    weatherSources,
    weatherForecast,
    weatherUpdatedAt,
    togglePlug,
    triggerIrrigation,
    sendRobotCommand,
    simulateAlert,
    weatherNote,
  };
};
