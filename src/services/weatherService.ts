import type { WeatherReading } from "./mockData";

export type ForecastHour = {
  time: string;
  temperature: number;
  rainProbability: number;
  condition: string;
};

export type ForecastDay = {
  date: string;
  min: number;
  max: number;
  rainProbability: number;
  condition: string;
  hours: ForecastHour[];
};

export type WeatherForecast = {
  days: ForecastDay[];
};

const LOCATION = {
  name: "Ragalna CT · Contrada Milia",
  latitude: 37.65,
  longitude: 14.95,
  altitudeOffsetM: 600,
};

const LAPSE_RATE = 0.0065;

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

const buildForecast = (data: any): WeatherForecast => {
  const daily = data?.daily ?? {};
  const hourly = data?.hourly ?? {};
  const hoursByDay: Record<string, ForecastHour[]> = {};
  const hourlyTimes: string[] = hourly.time ?? [];

  for (let i = 0; i < hourlyTimes.length; i += 1) {
    const timestamp = String(hourlyTimes[i] ?? "");
    if (!timestamp) {
      continue;
    }
    const dayKey = timestamp.split("T")[0];
    if (!hoursByDay[dayKey]) {
      hoursByDay[dayKey] = [];
    }
    hoursByDay[dayKey].push({
      time: timestamp,
      temperature: adjustTemperature(Number(hourly.temperature_2m?.[i] ?? 0)),
      rainProbability: clamp(Number(hourly.precipitation_probability?.[i] ?? 0), 0, 100),
      condition: weatherCodeLabel(Number(hourly.weather_code?.[i] ?? 1)),
    });
  }

  const dailyTimes: string[] = daily.time ?? [];
  const days = dailyTimes.map((day, index) => ({
    date: String(day),
    min: adjustTemperature(Number(daily.temperature_2m_min?.[index] ?? 0)),
    max: adjustTemperature(Number(daily.temperature_2m_max?.[index] ?? 0)),
    rainProbability: clamp(Number(daily.precipitation_probability_max?.[index] ?? 0), 0, 100),
    condition: weatherCodeLabel(Number(daily.weather_code?.[index] ?? 1)),
    hours: hoursByDay[String(day)] ?? [],
  }));

  return { days };
};

const fetchOpenMeteoBundle = async (): Promise<{ reading: WeatherReading; sources: string[]; forecast: WeatherForecast } | null> => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LOCATION.latitude));
  url.searchParams.set("longitude", String(LOCATION.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
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
    reading: {
      temperature,
      humidity,
      rainProbability: clamp(rainProbability, 0, 100),
      condition: weatherCodeLabel(Number(data.current?.weather_code ?? 1)),
    },
    sources: ["Open-Meteo"],
    forecast: buildForecast(data),
  };
};

const fetchSecureAggregate = async (): Promise<{ reading: WeatherReading; sources: string[]; forecast: WeatherForecast } | null> => {
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
        forecast: data.forecast && Array.isArray(data.forecast?.days)
          ? {
              days: data.forecast.days.map((day: any) => ({
                date: String(day.date),
                min: Number(day.min),
                max: Number(day.max),
                rainProbability: Number(day.rainProbability),
                condition: String(day.condition ?? "Variabile"),
                hours: Array.isArray(day.hours)
                  ? day.hours.map((hour: any) => ({
                      time: String(hour.time),
                      temperature: Number(hour.temperature),
                      rainProbability: Number(hour.rainProbability),
                      condition: String(hour.condition ?? "Variabile"),
                    }))
                  : [],
              })),
            }
          : { days: [] },
      };
    } catch {
      continue;
    }
  }
  return null;
};

export const fetchWeatherAverage = async (): Promise<{ reading: WeatherReading; sources: string[]; forecast: WeatherForecast }> => {
  const secureData = await fetchSecureAggregate();
  if (secureData) {
    return secureData;
  }

  const openMeteo = await fetchOpenMeteoBundle();
  if (!openMeteo) {
    throw new Error("Weather sources unavailable");
  }

  return openMeteo;
};

export const getWeatherLocationLabel = () => LOCATION.name;
