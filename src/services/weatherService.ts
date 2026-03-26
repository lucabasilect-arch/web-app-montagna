import type { WeatherReading } from "./mockData";

const LOCATION = {
  name: "Ragalna CT · Contrada Milia",
  latitude: 37.65,
  longitude: 14.95,
  altitudeOffsetM: 600,
};

const LAPSE_RATE = 0.0065;

type WeatherSourceResult = {
  temperature: number;
  humidity: number;
  rainProbability: number;
  condition: string;
  source: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const adjustTemperature = (temperature: number) => temperature - LAPSE_RATE * LOCATION.altitudeOffsetM;

const weatherCodeLabel = (code: number) => {
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

const fetchOpenMeteo = async (): Promise<WeatherSourceResult | null> => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LOCATION.latitude));
  url.searchParams.set("longitude", String(LOCATION.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "Europe/Rome");

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const temperature = adjustTemperature(Number(data.current?.temperature_2m ?? 0));
  const humidity = Number(data.current?.relative_humidity_2m ?? 0);
  const rainProbability = Number(data.hourly?.precipitation_probability?.[0] ?? 0);
  return {
    temperature,
    humidity,
    rainProbability: clamp(rainProbability, 0, 100),
    condition: weatherCodeLabel(Number(data.current?.weather_code ?? 1)),
    source: "Open-Meteo",
  };
};

const fetchSecureAggregate = async (): Promise<{ reading: WeatherReading; sources: string[] } | null> => {
  const endpoints = ["/api/weather"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        continue;
      }
      const data = await response.json();
      if (!data?.reading || !Array.isArray(data?.sources)) {
        continue;
      }
      return {
        reading: {
          temperature: Number(data.reading.temperature),
          humidity: Number(data.reading.humidity),
          rainProbability: Number(data.reading.rainProbability),
          condition: String(data.reading.condition ?? "Variabile"),
        },
        sources: data.sources.map((source: unknown) => String(source)),
      };
    } catch {
      continue;
    }
  }
  return null;
};

export const fetchWeatherAverage = async (): Promise<{ reading: WeatherReading; sources: string[] }> => {
  const secureData = await fetchSecureAggregate();
  if (secureData) {
    return secureData;
  }

  const results = (await Promise.all([fetchOpenMeteo()])).filter((item): item is WeatherSourceResult => Boolean(item));

  if (results.length === 0) {
    throw new Error("Weather sources unavailable");
  }

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const temperature = average(results.map((item) => item.temperature));
  const humidity = average(results.map((item) => item.humidity));
  const rainProbability = average(results.map((item) => item.rainProbability));

  const condition = results
    .slice()
    .sort((a, b) => b.rainProbability - a.rainProbability)[0]
    .condition;

  return {
    reading: {
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(0)),
      rainProbability: parseFloat(rainProbability.toFixed(0)),
      condition,
    },
    sources: results.map((item) => item.source),
  };
};

export const getWeatherLocationLabel = () => LOCATION.name;
