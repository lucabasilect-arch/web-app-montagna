export type SmartPlug = {
  id: string;
  label: string;
  status: "on" | "off";
  powerW: number;
};

export type SensorReading = {
  id: string;
  label: string;
  type: "soil" | "air";
  value: number;
  unit: string;
};

export type WeatherReading = {
  temperature: number;
  humidity: number;
  rainProbability: number;
  condition: string;
};

export type IrrigationLog = {
  timestamp: string;
  mode: "manual" | "auto";
  durationMinutes: number;
  moistureAfter: number;
};

export type RobotState = {
  status: "idle" | "cutting" | "returning" | "charging" | "error";
  battery: number;
  message: string;
};

export type CameraAlert = {
  id: string;
  message: string;
  time: string;
  type: "movement" | "person";
};

const plugDefinitions = [
  { id: "kitchen-pump", label: "Pompa acqua serra" },
  { id: "outdoor-lights", label: "Luci pergola" },
  { id: "fogger", label: "Nebulizzatore" },
];

export const createInitialPlugs = (): SmartPlug[] =>
  plugDefinitions.map((plug) => ({
    ...plug,
    status: Math.random() > 0.4 ? "on" : "off",
    powerW: parseFloat((Math.random() * 120).toFixed(1)),
  }));

export const createSensorReadings = (): SensorReading[] => [
  {
    id: "soil-moisture",
    label: "Umidità terreno",
    type: "soil",
    value: parseFloat((30 + Math.random() * 40).toFixed(1)),
    unit: "%",
  },
  {
    id: "air-temperature",
    label: "Temperatura esterna",
    type: "air",
    value: parseFloat((8 + Math.random() * 15).toFixed(1)),
    unit: "°C",
  },
  {
    id: "air-humidity",
    label: "Umidità aria",
    type: "air",
    value: parseFloat((40 + Math.random() * 30).toFixed(1)),
    unit: "%",
  },
];

const weatherStates = [
  { condition: "Sereno", temperature: 12, humidity: 55 },
  { condition: "Nuvoloso", temperature: 8, humidity: 65 },
  { condition: "Pioggia leggera", temperature: 6, humidity: 75 },
  { condition: "Nebbia", temperature: 3, humidity: 80 },
  { condition: "Parzialmente soleggiato", temperature: 10, humidity: 50 },
];

export const randomWeather = (): WeatherReading => {
  const base = weatherStates[Math.floor(Math.random() * weatherStates.length)];
  const temperature = base.temperature + Math.random() * 5;
  const humidity = Math.min(95, base.humidity + Math.random() * 10);
  const rainProbability = Math.min(100, humidity + Math.random() * 20);
  return {
    condition: base.condition,
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(0)),
    rainProbability: parseFloat(rainProbability.toFixed(0)),
  };
};

export const createRobotState = (): RobotState => ({
  status: Math.random() > 0.7 ? "cutting" : "idle",
  battery: parseFloat((70 + Math.random() * 25).toFixed(0)),
  message: "Cooler now, ready for commands",
});

export const createCameraAlert = (index: number): CameraAlert => ({
  id: `camera-${Date.now()}-${index}`,
  message: Math.random() > 0.6
    ? "Movimento rilevato vicino all'area boschiva"
    : "Presenza umana rilevata alla porta principale",
  time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  type: Math.random() > 0.5 ? "movement" : "person",
});

export const createInitialIrrigationLog = (): IrrigationLog[] => [
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    durationMinutes: 12,
    mode: "auto",
    moistureAfter: 52,
  },
  {
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    durationMinutes: 7,
    mode: "manual",
    moistureAfter: 47,
  },
];
