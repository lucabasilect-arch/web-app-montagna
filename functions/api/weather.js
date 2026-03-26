import { aggregateWeather } from "../../server/weather-core.js";

export const onRequestGet = async ({ env }) => {
  try {
    const payload = await aggregateWeather({
      weatherApiKey: env.WEATHERAPI_KEY,
      openWeatherKey: env.OPENWEATHER_KEY,
    });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Weather aggregation failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
