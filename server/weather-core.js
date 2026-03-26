const LOCATION = {
  name: "Ragalna CT · Contrada Milia",
  latitude: 37.65,
  longitude: 14.95,
  altitudeOffsetM: 600,
};

const LAPSE_RATE = 0.0065;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const adjustTemperature = (temperature) => temperature - LAPSE_RATE * LOCATION.altitudeOffsetM;

const weatherCodeLabel = (code) => {
  if (code === 0) return "Sereno";
  if (code <= 2) return "Parzialmente nuvoloso";
  if (code <= 48) return "Nebbia";
  if (code <= 57) return "Pioggia leggera";
  if (code <= 67) return "Pioggia";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Rovesci";
  if (code <= 86) return "Neve intensa";
  if (code <= 99) return "Temporale";
  return "Variabile";
};

const estimateRainProbability = (humidity, conditionText) => {
  const normalized = conditionText.toLowerCase();
  if (normalized.includes("tempor")) return 85;
  if (normalized.includes("piogg") || normalized.includes("rain")) return 75;
  if (normalized.includes("neve") || normalized.includes("snow")) return 70;
  if (normalized.includes("nuvol") || normalized.includes("cloud")) return clamp(humidity, 45, 70);
  return clamp(humidity * 0.4, 15, 55);
};

const fetchOpenMeteo = async () => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LOCATION.latitude));
  url.searchParams.set("longitude", String(LOCATION.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "Europe/Rome");

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  return {
    source: "Open-Meteo",
    temperature: adjustTemperature(Number(data.current?.temperature_2m ?? 0)),
    humidity: Number(data.current?.relative_humidity_2m ?? 0),
    rainProbability: clamp(Number(data.hourly?.precipitation_probability?.[0] ?? 0), 0, 100),
    condition: weatherCodeLabel(Number(data.current?.weather_code ?? 1)),
  };
};

const fetchWeatherApi = async (weatherApiKey) => {
  if (!weatherApiKey) return null;
  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", weatherApiKey);
  url.searchParams.set("q", `${LOCATION.latitude},${LOCATION.longitude}`);
  url.searchParams.set("lang", "it");

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  const humidity = Number(data.current?.humidity ?? 0);
  const condition = String(data.current?.condition?.text ?? "Variabile");
  return {
    source: "WeatherAPI",
    temperature: adjustTemperature(Number(data.current?.temp_c ?? 0)),
    humidity,
    rainProbability: estimateRainProbability(humidity, condition),
    condition,
  };
};

const fetchOpenWeather = async (openWeatherKey) => {
  if (!openWeatherKey) return null;
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(LOCATION.latitude));
  url.searchParams.set("lon", String(LOCATION.longitude));
  url.searchParams.set("appid", openWeatherKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "it");

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  const humidity = Number(data.main?.humidity ?? 0);
  const condition = String(data.weather?.[0]?.description ?? "Variabile");
  return {
    source: "OpenWeather",
    temperature: adjustTemperature(Number(data.main?.temp ?? 0)),
    humidity,
    rainProbability: estimateRainProbability(humidity, condition),
    condition,
  };
};

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export const aggregateWeather = async ({ weatherApiKey, openWeatherKey }) => {
  const results = (await Promise.all([
    fetchOpenMeteo(),
    fetchWeatherApi(weatherApiKey),
    fetchOpenWeather(openWeatherKey),
  ])).filter(Boolean);

  if (results.length === 0) {
    throw new Error("Weather sources unavailable");
  }

  return {
    reading: {
      temperature: Number(average(results.map((item) => item.temperature)).toFixed(1)),
      humidity: Number(average(results.map((item) => item.humidity)).toFixed(0)),
      rainProbability: Number(average(results.map((item) => item.rainProbability)).toFixed(0)),
      condition: results.slice().sort((a, b) => b.rainProbability - a.rainProbability)[0].condition,
    },
    sources: results.map((item) => item.source),
    location: LOCATION.name,
    updatedAt: new Date().toISOString(),
  };
};
